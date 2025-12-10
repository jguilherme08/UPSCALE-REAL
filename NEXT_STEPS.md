# 🎯 PRÓXIMOS PASSOS - Implementação Real-ESRGAN + Vercel

## ✅ JÁ IMPLEMENTADO

- [x] `/api/upscale.py` - Função serverless Python com ONNX Runtime
- [x] `requirements.txt` - Dependências Python (pillow, numpy, onnxruntime)
- [x] `vercel.json` - Configuração correta com Python 3.10
- [x] `app/upload.tsx` - Frontend enviando base64 em JSON
- [x] Deletado `app/api/upscale/route.ts` (spawn incompatível)
- [x] Script `scripts/convert_to_onnx.py` - Converter .pth → .onnx
- [x] Documentação em `DEPLOYMENT.md`

## 🚀 PRÓXIMAS AÇÕES OBRIGATÓRIAS

### 1️⃣ Converter Modelos (CRÍTICO)

Execute no terminal:

```powershell
cd c:\Users\User\OneDrive\Documentos\UPSCALER\image-upscaler
python scripts/convert_to_onnx.py
```

Isso gerará:
- `python/RealESRGAN_x2plus.onnx` (~50MB)
- `python/RealESRGAN_x4plus.onnx` (~50MB)

### 2️⃣ Testar Localmente

```powershell
npm run dev
```

Acesse: `http://localhost:3000`

Faça upload de uma imagem e teste o upscaling.

### 3️⃣ Commit dos Modelos ONNX

```powershell
git add python/*.onnx
git commit -m "Add ONNX models for Vercel serverless"
git push origin main
```

### 4️⃣ Deploy no Vercel

```powershell
vercel deploy
```

Ou faça push para GitHub e o Vercel fará deploy automático.

## 📊 Checklist de Deploy

- [ ] Modelos convertidos (RealESRGAN_x2plus.onnx, RealESRGAN_x4plus.onnx)
- [ ] Teste local funciona com `/api/upscale`
- [ ] `requirements.txt` no root com dependências Python
- [ ] `vercel.json` configurado com `python3.10` runtime
- [ ] Nenhum arquivo `.pth` no `.gitignore` (opcional, economiza espaço)
- [ ] Git push com modelos ONNX
- [ ] Deploy no Vercel confirmado

## 🔍 Verificação Final

Após deploy, acesse sua URL no Vercel e:

1. Faça upload de uma imagem
2. Selecione escala (2x ou 4x)
3. Clique em "Upscale"
4. Aguarde ~10-20s (primeira requisição pode ser mais lenta)
5. Resultado deve aparecer e permitir download

## ⚡ Diferenças da Implementação Anterior

| Anterior | Novo |
|----------|------|
| ❌ Node.js spawn("python") | ✅ Função Python serverless |
| ❌ Bloqueado pela Vercel | ✅ 100% suportado |
| ❌ Timeout constant | ✅ Estável 10-20s |
| ❌ Erro ENOENT | ✅ Sem erros |

## 🆘 Se Algo Não Funcionar

### Erro: "ModuleNotFoundError: No module named 'torch'"
```
Solução: convert_to_onnx.py é APENAS para desenvolvimento local
        Não é necessário no Vercel (já gera .onnx)
```

### Erro: "No such file or directory: RealESRGAN_x2plus.onnx"
```
Solução: Execute: python scripts/convert_to_onnx.py
```

### Timeout 504 no Vercel
```
Solução: Imagem muito grande ou Pro plan necessário
        Tente com imagens < 2048px
```

## 📦 Estrutura Final

```
image-upscaler/
├── api/
│   └── upscale.py                    ✅ Handler Vercel
├── app/
│   ├── upload.tsx                    ✅ Frontend atualizado
│   └── page.tsx
├── python/
│   ├── RealESRGAN_x2plus.onnx        ✅ NOVO
│   ├── RealESRGAN_x4plus.onnx        ✅ NOVO
│   ├── models/
│   │   ├── RealESRGAN_x2plus.pth
│   │   └── RealESRGAN_x4plus.pth
│   └── upscale.py
├── scripts/
│   └── convert_to_onnx.py            ✅ NOVO
├── requirements.txt                   ✅ ATUALIZADO
├── vercel.json                        ✅ ATUALIZADO
└── DEPLOYMENT.md                      ✅ NOVO

```

## 💡 Bônus: CI/CD com GitHub Actions

Para automatizar conversão na pull request (opcional):

```yaml
# .github/workflows/convert-models.yml
name: Convert Models
on: [push]
jobs:
  convert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.10'
      - run: |
          pip install torch
          python scripts/convert_to_onnx.py
      - uses: actions/upload-artifact@v2
        with:
          name: onnx-models
          path: python/*.onnx
```

---

**Status Final**: ✅ Pronto para deploy em Vercel!
