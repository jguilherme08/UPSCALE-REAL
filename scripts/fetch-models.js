// Downloads RealESRGAN ONNX models into python/models for Vercel builds.
// Skips downloads if files already exist.
const fs = require('fs');
const path = require('path');
const https = require('https');

// Real-ESRGAN ONNX models from verified CDN source
// Note: These models must be manually placed if auto-download fails
const MODELS = [
  {
    name: 'RealESRGAN_x2plus.onnx',
    url: 'https://drive.usercontent.google.com/download?id=1pJ_T-V1dpb1ewoEra1TGSWl5e6H7M4NN&export=download&confirm=t'
  },
  {
    name: 'RealESRGAN_x4plus.onnx',
    url: 'https://drive.usercontent.google.com/download?id=1yOKGLqHQJtKqd7tCBqvx7V3LnAqLQc2D&export=download&confirm=t'
  }
];

const modelsDir = path.join(__dirname, '..', 'python', 'models');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function downloadWithRedirect(url, dest, attempt = 0) {
  const maxRedirects = 4;
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (attempt >= maxRedirects) return reject(new Error('Too many redirects'));
          const nextUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          res.resume();
          return resolve(downloadWithRedirect(nextUrl, dest, attempt + 1));
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download failed: ${res.statusCode}`));
        }

        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => fileStream.close(resolve));
        fileStream.on('error', reject);
      })
      .on('error', reject);
  });
}

async function main() {
  ensureDir(modelsDir);
  console.log('[info] Model auto-download may fail; models can be placed manually in python/models/');
  
  for (const model of MODELS) {
    const target = path.join(modelsDir, model.name);
    if (fs.existsSync(target)) {
      console.log(`[skip] ${model.name} already exists`);
      continue;
    }
    console.log(`[fetch] ${model.name} ...`);
    try {
      await downloadWithRedirect(model.url, target);
      console.log(`[done] ${model.name}`);
    } catch (err) {
      console.warn(`[warn] Failed to download ${model.name}: ${err.message}`);
      console.warn(`[warn] Place ${model.name} manually in python/models/ before deploying`);
    }
  }
}

main().catch((err) => {
  console.error('[error] Model download script failed:', err.message);
  console.warn('[warn] Continuing build; ensure models are manually placed in python/models/');
  process.exit(0); // Don't fail build, just warn
});
