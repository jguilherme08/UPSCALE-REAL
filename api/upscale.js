const express = require('express');
const bodyParser = require('body-parser');
const base64 = require('base64-js');
const { InferenceSession } = require('onnxruntime-node');
const Jimp = require('jimp');

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/upscale', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Decodificar imagem base64
    const imageBuffer = Buffer.from(image, 'base64');
    const jimpImage = await Jimp.read(imageBuffer);
    jimpImage.background(0xFFFFFFFF);
    jimpImage.rgba(true);
    const { data, width, height } = jimpImage.bitmap;

    // Converter para Float32 e normalizar
    const imgArray = new Float32Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
      imgArray[i * 3 + 0] = data[i * 4 + 0] / 255.0;
      imgArray[i * 3 + 1] = data[i * 4 + 1] / 255.0;
      imgArray[i * 3 + 2] = data[i * 4 + 2] / 255.0;
    }

    // Formatar para [1, 3, H, W]
    const inputTensor = new Float32Array(1 * 3 * height * width);
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          inputTensor[c * height * width + y * width + x] = imgArray[y * width * 3 + x * 3 + c];
        }
      }
    }

    // Carregar modelo ONNX
    const session = await InferenceSession.create('python/model.onnx');
    const inputName = session.inputNames[0];
    const feeds = {};
    feeds[inputName] = inputTensor;
    const results = await session.run(feeds);
    const output = results[session.outputNames[0]];

    // Pós-processar saída para imagem
    const outHeight = output.dims[2];
    const outWidth = output.dims[3];
    const outData = output.data;
    const outImage = new Jimp(outWidth, outHeight);
    for (let y = 0; y < outHeight; y++) {
      for (let x = 0; x < outWidth; x++) {
        const r = Math.round(outData[0 * outHeight * outWidth + y * outWidth + x] * 255);
        const g = Math.round(outData[1 * outHeight * outWidth + y * outWidth + x] * 255);
        const b = Math.round(outData[2 * outHeight * outWidth + y * outWidth + x] * 255);
        outImage.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
      }
    }

    // Codificar imagem para base64
    const outBuffer = await outImage.getBufferAsync(Jimp.MIME_PNG);
    const outBase64 = outBuffer.toString('base64');
    res.json({ image: outBase64 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
