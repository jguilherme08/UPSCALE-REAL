# Realistic Image Upscaler (CPU, Vercel-ready)

Next.js 14 + Tailwind frontend with a Python (Real-ESRGAN ONNX) backend designed for CPU-only Vercel deployments. No hallucinations: only sharpening, deblocking, and texture preservation.

## Features
- Upload with drag/drop, preview, upscale 2x/4x.
- API returns base64 PNG; download button on the UI.
- Python 3.10 with Pillow, OpenCV, onnxruntime; tiled inference to stay within memory/15s serverless limits.
- Input limit: até 4096px em 2x ou 2048px em 4x (saída guardada em <=8192px), ~12MB payload guard.

## Setup
1. Install Node deps:
   ```powershell
   cd image-upscaler; npm install
   ```
2. Install Python deps locally (optional but recommended for testing):
   ```powershell
   python -m pip install -r python/requirements.txt
   ```
3. Model download:
   - Já há um script: `npm run fetch:models` (usado automaticamente no `npm run build`) que baixa `RealESRGAN_x2plus.onnx` e `RealESRGAN_x4plus.onnx` para `python/models/` se não existirem.
   - Se preferir baixar manualmente, coloque os arquivos em `python/models/`.

## Run locally
```powershell
npm run dev
```
The API will call your system `python`. Ensure the models are in `python/models/`.

## Deploy to Vercel
- Project root: `image-upscaler`.
- Vercel will run `npm install` then `npm run build`.
- Include `python/requirements.txt` and the ONNX models in the repo (or provide a download step in build if desired).
- Runtime: Node 18+ (serverless); CPU only. Max duration set to 15s.

## API contract
`POST /api/upscale`
- Body: `multipart/form-data` with `image` (file) and `scale` (`2` or `4`).
- Response: `{ image: <base64_png>, scale: number, format: "png" }`
- Errors: JSON `{ error: string }` with appropriate status codes.

## Notes
- Tiling reduces memory usage; adjust `--tile` in `python/upscale.py` if needed. Escala 4x acima de 2048px é bloqueada para caber no limite de saída/tempo serverless.
- No detail hallucination: uses Real-ESRGAN classic x2/x4 models only.
- Respect serverless time: prefer inputs <= 2048px for best throughput; 4096px is the hard stop.
