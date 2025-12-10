import argparse
import base64
import io
import os
import sys
from typing import Tuple

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

MAX_DIMENSION = 4096
MAX_OUTPUT = 8192  # guard scaled size to fit serverless RAM/time
DEFAULT_TILE = 256
OVERLAP = 16

os.environ.setdefault('OMP_NUM_THREADS', '1')
os.environ.setdefault('OMP_WAIT_POLICY', 'PASSIVE')


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description='CPU Real-ESRGAN upscaler (Vercel-friendly).')
  parser.add_argument('--input', required=True, help='Input image path')
  parser.add_argument('--scale', choices=['2', '4'], default='2', help='Upscale factor')
  parser.add_argument('--tile', type=int, default=DEFAULT_TILE, help='Tile size for memory-friendly inference')
  return parser.parse_args()


def load_image(path: str, scale: int) -> Image.Image:
  image = Image.open(path).convert('RGB')
  w, h = image.size
  if max(w, h) > MAX_DIMENSION:
    raise ValueError(f'Imagem excede {MAX_DIMENSION}px (w={w}, h={h}). Reduza antes do envio.')
  if max(w, h) * scale > MAX_OUTPUT:
    raise ValueError(
      f'Saída excederia {MAX_OUTPUT}px (w={w * scale}, h={h * scale}). Use escala menor ou reduza a imagem.'
    )
  return image


def pick_model(scale: str) -> str:
  base_dir = os.path.dirname(os.path.abspath(__file__))
  models_dir = os.path.join(base_dir, 'models')
  if scale == '4':
    candidate = os.path.join(models_dir, 'RealESRGAN_x4plus.onnx')
  else:
    candidate = os.path.join(models_dir, 'RealESRGAN_x2plus.onnx')
  if not os.path.exists(candidate):
    raise FileNotFoundError(
      f'Modelo ONNX não encontrado em {candidate}. Baixe RealESRGAN_x2plus.onnx ou x4plus.onnx e coloque em python/models.'
    )
  return candidate


def to_numpy(image: Image.Image) -> np.ndarray:
  arr = np.array(image)
  return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def run_session(session: ort.InferenceSession, tile: np.ndarray) -> np.ndarray:
  inp = tile.astype(np.float32) / 255.0
  inp = np.transpose(inp, (2, 0, 1))[None, ...]
  ort_inputs = {session.get_inputs()[0].name: inp}
  output = session.run(None, ort_inputs)[0]
  # output shape: (1, 3, H*scale, W*scale)
  return output[0].transpose(1, 2, 0)


def upscale_tiled(img: np.ndarray, session: ort.InferenceSession, scale: int, tile: int) -> np.ndarray:
  h, w, _ = img.shape
  step = max(tile - OVERLAP, 32)
  out = np.zeros((h * scale, w * scale, 3), dtype=np.float32)
  weight = np.zeros_like(out)

  for y in range(0, h, step):
    for x in range(0, w, step):
      tile_patch = img[y : min(y + tile, h), x : min(x + tile, w), :]
      out_tile = run_session(session, tile_patch)
      oh, ow, _ = out_tile.shape
      oy, ox = y * scale, x * scale
      out[oy : oy + oh, ox : ox + ow] += out_tile
      weight[oy : oy + oh, ox : ox + ow] += 1.0

  weight[weight == 0] = 1.0
  merged = out / weight
  merged = np.clip(merged * 255.0, 0, 255).astype(np.uint8)
  return cv2.cvtColor(merged, cv2.COLOR_BGR2RGB)


def encode_base64(image: np.ndarray) -> str:
  pil_img = Image.fromarray(image)
  buf = io.BytesIO()
  pil_img.save(buf, format='PNG')
  return base64.b64encode(buf.getvalue()).decode('utf-8')


def main():
  args = parse_args()
  scale_int = int(args.scale)
  image = load_image(args.input, scale_int)

  model_path = pick_model(args.scale)
  opts = ort.SessionOptions()
  opts.intra_op_num_threads = 1
  opts.inter_op_num_threads = 1
  opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
  session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'], sess_options=opts)

  np_img = to_numpy(image)
  upscaled = upscale_tiled(np_img, session, scale_int, args.tile)
  print(encode_base64(upscaled))


if __name__ == '__main__':
  try:
    main()
  except Exception as exc:  # Rare; surface readable error upstream.
    sys.stderr.write(str(exc))
    sys.exit(1)
