'use client';

import { useMemo, useState } from 'react';

const MAX_DIMENSION = 4096;

export default function UpscaleClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [scale, setScale] = useState<2 | 4>(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const helperText = useMemo(
    () =>
      `CPU-only Real-ESRGAN on Vercel (até ${MAX_DIMENSION}px para 2x, até ${MAX_DIMENSION / 2}px para 4x; ~10-15s). Zero hallucinação; só nitidez/denoise/restore.`,
    []
  );

  const onFileChange = (next: File | null) => {
    setError(null);
    setResult(null);
    setFile(next);
    if (!next) {
      setPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(next);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    if (!next) return;
    onFileChange(next);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const next = e.dataTransfer.files?.[0];
    if (next) onFileChange(next);
  };

  const requestUpscale = async () => {
    if (!file) {
      setError('Selecione uma imagem primeiro.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Converter arquivo para base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extrair apenas a parte base64 (remover data:image/...;base64,)
          const base64Part = result.split(',')[1];
          resolve(base64Part);
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          scale: String(scale)
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Erro ao processar imagem');
      }
      const payload = await res.json();
      const base64 = payload?.image as string;
      if (!base64) throw new Error('Resposta vazia do serviço.');
      setResult(`data:image/png;base64,${base64}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha inesperada';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `upscaled-${scale}x.png`;
    link.click();
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Realistic Upscaler</p>
          <h1 className="text-3xl font-semibold mt-2">Real-ESRGAN CPU • Vercel Ready</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">{helperText}</p>
        </div>
        <div className="flex items-center gap-3">
          {[2, 4].map((value) => (
            <button
              key={value}
              className={`px-4 py-2 rounded-full border border-white/10 transition ${
                scale === value ? 'bg-accent text-slate-900' : 'bg-panel hover:border-accent/60'
              }`}
              onClick={() => setScale(value as 2 | 4)}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        <div
          className="card input-area h-full"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="space-y-3">
            <p className="text-lg font-medium">Upload</p>
            <p className="text-slate-400 text-sm">
              Arraste uma imagem ou clique para selecionar (JPG/PNG, até {MAX_DIMENSION}px em 2x ou
              2048px em 4x). Nada de invenção: apenas nitidez real, preservação de textura e bordas
              naturais.
            </p>
            <label className="cursor-pointer inline-flex items-center gap-3 bg-white/5 rounded-full px-4 py-2 border border-white/5 hover:border-accent/60">
              <input type="file" accept="image/*" className="hidden" onChange={handleInput} />
              <span className="text-sm">Escolher imagem</span>
            </label>
            {preview && (
              <div className="mt-4">
                <p className="text-sm text-slate-400 mb-2">Pré-visualização</p>
                <img src={preview} alt="Pré-visualização" className="rounded-lg w-full object-contain" />
              </div>
            )}
            {file && !preview && <p className="text-sm text-slate-400">Arquivo pronto para envio.</p>}
          </div>
        </div>

        <div className="card h-full space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-lg font-medium">Resultado</p>
            <div className="text-xs text-slate-400">Tempo alvo: ~10s no CPU (Vercel)</div>
          </div>
          <div className="border border-white/5 rounded-xl bg-white/5 min-h-[240px] flex items-center justify-center overflow-hidden">
            {isLoading && <p className="text-sm text-slate-300">Processando... (tile-based, CPU)</p>}
            {!isLoading && result && <img src={result} alt="Upscaled" className="w-full" />}
            {!isLoading && !result && <p className="text-sm text-slate-500">Aguardando processamento.</p>}
          </div>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button className="btn-primary" onClick={requestUpscale} disabled={isLoading}>
              {isLoading ? 'Processando...' : `Upscale ${scale}x`}
            </button>
            <button
              className="rounded-full px-5 py-2 font-medium border border-white/10 hover:border-accent/60 transition"
              onClick={downloadResult}
              disabled={!result}
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
