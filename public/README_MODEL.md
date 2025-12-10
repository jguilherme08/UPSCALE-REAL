# INSTRUÇÕES PARA OBTER O MODELO ONNX

## Opção 1: Baixar Modelo Oficial (RECOMENDADO)

Baixe o modelo Real-ESRGAN x2 em formato ONNX:

1. Acesse: https://github.com/xinntao/Real-ESRGAN/releases
2. Procure por "RealESRGAN_x2plus.onnx" ou "RealESRGAN_x4plus.onnx"
3. Baixe o arquivo
4. Coloque aqui em: `image-upscaler/public/model.onnx`

## Opção 2: Converter do PyTorch

Se você tem um modelo .pth:

```bash
cd Real-ESRGAN-master
pip install torch onnx
python scripts/pytorch2onnx.py --input experiments/pretrained_models/RealESRGAN_x2plus.pth --output ../image-upscaler/public/model.onnx
```

## Opção 3: Modelo Temporário para Testes

Para testes rápidos sem qualidade real, você pode usar qualquer modelo ONNX de upscaling.

## Formato Esperado

O modelo deve aceitar:
- **Input**: Tensor float32 com shape `[1, H, W, 3]` ou `[1, 3, H, W]`
- **Output**: Tensor float32 com shape upscaled

## Status Atual

⚠️ **MODELO NÃO ENCONTRADO**

Execute um dos métodos acima para adicionar `model.onnx` nesta pasta.

Depois disso, o projeto estará 100% funcional!
