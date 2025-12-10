// Downloads RealESRGAN ONNX models into python/models for Vercel builds.
// Skips downloads if files already exist.
const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS = [
  {
    name: 'RealESRGAN_x2plus.onnx',
    url: 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/RealESRGAN_x2plus.onnx'
  },
  {
    name: 'RealESRGAN_x4plus.onnx',
    url: 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/RealESRGAN_x4plus.onnx'
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
  for (const model of MODELS) {
    const target = path.join(modelsDir, model.name);
    if (fs.existsSync(target)) {
      console.log(`[skip] ${model.name} already exists`);
      continue;
    }
    console.log(`[fetch] ${model.name} ...`);
    await downloadWithRedirect(model.url, target);
    console.log(`[done] ${model.name}`);
  }
}

main().catch((err) => {
  console.error('Model download failed:', err.message);
  process.exit(1);
});
