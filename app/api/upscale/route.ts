import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type PythonResult = {
  code: number;
  stdout: string;
  stderr: string;
};

async function runPython(scriptPath: string, inputPath: string, scale: string): Promise<PythonResult> {
  return new Promise((resolve, reject) => {
    // Vercel uses /usr/bin/python3 in serverless functions
    const pythonBin = '/usr/bin/python3';
    const env = {
      ...process.env,
      PYTHONPATH: path.join(process.cwd(), 'python', '.venv'),
      PYTHONUNBUFFERED: '1'
    };

    const child = spawn(pythonBin, [scriptPath, '--input', inputPath, '--scale', scale], { env });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      resolve({
        code: typeof code === 'number' ? code : 1,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

export async function POST(req: Request) {
  let tmpDir: string | null = null;
  try {
    const formData = await req.formData();
    const image = formData.get('image');
    const scaleRaw = (formData.get('scale') || '2').toString();
    const scale = scaleRaw === '4' ? '4' : '2';

    if (!(image instanceof Blob)) {
      return NextResponse.json({ error: 'Imagem ausente.' }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 });
    }
    if (buffer.length > 12 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem muito grande para CPU (limite ~12MB).' }, { status: 413 });
    }

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'upscale-'));
    const inputPath = path.join(tmpDir, 'input-image');
    await fs.writeFile(inputPath, buffer);

    const scriptPath = path.join(process.cwd(), 'python', 'upscale.py');
    const { code, stdout, stderr } = await runPython(scriptPath, inputPath, scale);
    if (code !== 0) {
      const message = stderr || 'Falha ao executar upscale.';
      const status = /modelo|exced|grande|imagem|arquivo/i.test(message) ? 400 : 500;
      throw new HttpError(status, message);
    }

    const base64 = stdout;
    return NextResponse.json({ image: base64, format: 'png', scale: Number(scale) });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Falha inesperada';
    return NextResponse.json({ error: message }, { status });
  } finally {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
