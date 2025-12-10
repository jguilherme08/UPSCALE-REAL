import argparse
import base64
import io
import os
import sys
from typing import Tuple

import cv2
import numpy as np
import torch
from basicsr.archs.rrdbnet_arch import RRDBNet
from PIL import Image
from realesrgan import RealESRGANer

MAX_DIMENSION = 4096
MAX_OUTPUT = 8192
DEFAULT_TILE = 256

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


def pick_model(scale: str) -> Tuple[str, RRDBNet]:
  base_dir = os.path.dirname(os.path.abspath(__file__))
  models_dir = os.path.join(base_dir, 'models')
  
  if scale == '4':
    model_path = os.path.join(models_dir, 'RealESRGAN_x4plus.pth')
    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
  else:
    model_path = os.path.join(models_dir, 'RealESRGAN_x2plus.pth')
    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2)
  
  if not os.path.exists(model_path):
    raise FileNotFoundError(
      f'Modelo não encontrado em {model_path}. Baixe RealESRGAN_x2plus.pth ou x4plus.pth e coloque em python/models.'
    )
  return model_path, model


def to_numpy(image: Image.Image) -> np.ndarray:
  arr = np.array(image)
  return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def upscale_image(img: np.ndarray, upsampler: RealESRGANer) -> np.ndarray:
  output, _ = upsampler.enhance(img, outscale=upsampler.scale)
  return cv2.cvtColor(output, cv2.COLOR_BGR2RGB)


def encode_base64(image: np.ndarray) -> str:
  pil_img = Image.fromarray(image)
  buf = io.BytesIO()
  pil_img.save(buf, format='PNG')
  return base64.b64encode(buf.getvalue()).decode('utf-8')


def main():
  args = parse_args()
  scale_int = int(args.scale)
  image = load_image(args.input, scale_int)

  model_path, model = pick_model(args.scale)
  
  upsampler = RealESRGANer(
    scale=scale_int,
    model_path=model_path,
    model=model,
    tile=args.tile,
    tile_pad=10,
    pre_pad=0,
    half=False,  # CPU mode
    device='cpu'
  )
  
  np_img = to_numpy(image)
  upscaled = upscale_image(np_img, upsampler)
  print(encode_base64(upscaled))


if __name__ == '__main__':
  try:
    main()
  except Exception as exc:  # Rare; surface readable error upstream.
    sys.stderr.write(str(exc))
    sys.exit(1)
