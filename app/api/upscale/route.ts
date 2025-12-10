import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(image, "base64");
    
    // Usa sharp para upscaling com interpolação de alta qualidade
    // Método Lanczos3 produz resultados excelentes
    const upscaledImage = await sharp(buffer)
      .resize({
        width: undefined,
        height: undefined,
        kernel: 'lanczos3', // Melhor qualidade de interpolação
        fastShrinkOnLoad: false
      })
      .resize({
        width: (await sharp(buffer).metadata()).width! * 2,
        height: (await sharp(buffer).metadata()).height! * 2,
        kernel: 'lanczos3'
      })
      .png()
      .toBuffer();

    return NextResponse.json({
      image: upscaledImage.toString("base64")
    });

  } catch (err: any) {
    console.error('Upscale error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
