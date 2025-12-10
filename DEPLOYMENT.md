# 🚀 Real-ESRGAN Upscaler para Vercel

Upscaler de imagens usando Real-ESRGAN em arquitetura **100% compatível com Vercel** (sem spawn, sem Python external).

## ✅ Arquitetura Correta para Vercel

```
Frontend (Next.js) → JSON base64 → /api/upscale.py (Função Python)
```

**Sem spawn de processos externos!**

## 📋 Pré-requisitos

- Python 3.10+
- Node.js 18+
- PyTorch (para conversão de modelos apenas)

## 🔧 Setup Local

### 1. Instalar dependências

```bash
# Frontend
npm install

# Python
pip install -r requirements.txt
```

### 2. Converter modelos de .pth para .onnx

**IMPORTANTE**: Os modelos precisam estar em formato ONNX para funcionarem no Vercel.

```bash
python scripts/convert_to_onnx.py \
  --input-dir python/models \
  --output-dir python
```

Isso gerará:
- `python/RealESRGAN_x2plus.onnx`
- `python/RealESRGAN_x4plus.onnx`

### 3. Testar localmente

```bash
npm run dev
```

Acesse `http://localhost:3000`

## 🌐 Deploy no Vercel

### 1. Fazer upload dos modelos ONNX

```bash
# Converter localmente (uma única vez)
python scripts/convert_to_onnx.py

# Commitar os .onnx no git
git add python/*.onnx
git commit -m "Add ONNX models"
git push
```

### 2. Deploy automático

```bash
vercel deploy
```

Ou use GitHub Actions para deploy automático na main.

## 📦 Arquivos Críticos

```
image-upscaler/
├── api/
│   └── upscale.py          ✅ Função serverless Python
├── app/
│   ├── upload.tsx          ✅ Frontend (envia base64)
│   ├── layout.tsx
│   └── page.tsx
├── python/
│   ├── RealESRGAN_x2plus.onnx  (gerado)
│   ├── RealESRGAN_x4plus.onnx  (gerado)
│   ├── models/
│   │   ├── RealESRGAN_x2plus.pth
│   │   └── RealESRGAN_x4plus.pth
│   └── upscale.py
├── requirements.txt
├── vercel.json             ✅ Config Vercel com Python 3.10
└── package.json
```

## ❌ Problemas Resolvidos

| Erro | Causa | Solução |
|------|-------|---------|
| `spawn python3 ENOENT` | Vercel bloqueia spawn de processos | ✅ Usar função Python serverless |
| Timeout | CPU lento no Vercel | ✅ Usar ONNX + CPU otimizado |
| Memory | Carregamento de modelos pesados | ✅ Aumentar maxDuration + memory |

## 🔍 Como Funciona

1. **Frontend** (`app/upload.tsx`):
   - Usuário faz upload de imagem
   - Converte para base64
   - Envia POST `/api/upscale` com JSON

2. **Backend** (`api/upscale.py`):
   - Recebe base64 da imagem
   - Decodifica para PIL Image
   - Carrega modelo ONNX (RealESRGAN_x2plus ou x4plus)
   - Executa inference
   - Retorna imagem upscalada em base64

3. **Frontend** (renderiza resultado):
   - Exibe imagem processada
   - Permite download

## ⚙️ Configuração Vercel

`vercel.json`:
```json
{
  "functions": {
    "api/*.py": {
      "runtime": "python3.10",
      "maxDuration": 60,
      "memory": 3008
    }
  }
}
```

- **runtime**: Python 3.10 (obrigatório)
- **maxDuration**: 60s (máximo para Vercel Pro)
- **memory**: 3GB (máximo recomendado)

## 📊 Performance

- **Tempo processamento**: ~10-20s no CPU (Vercel)
- **Tamanho máximo entrada**: 4096px (2x) / 2048px (4x)
- **Output**: PNG lossless em base64

## 🚨 Troubleshooting

### ONNX model not found
```
❌ Erro: Modelo não encontrado
✅ Solução: Rodar convert_to_onnx.py localmente
```

### Memory exceeded
```
❌ Erro: Vercel memory limit exceeded
✅ Solução: Usar imagens menores ou reduzir batch size
```

### Timeout on Vercel
```
❌ Erro: Function timed out after 60 seconds
✅ Solução: Usar Pro plan para maxDuration > 30s
```

## 📚 Recursos

- [Vercel Python Functions](https://vercel.com/docs/functions/python)
- [Real-ESRGAN GitHub](https://github.com/xinntao/Real-ESRGAN)
- [ONNX Runtime](https://onnxruntime.ai/)

## 📝 Licença

MIT (Real-ESRGAN mantém sua licença original)
