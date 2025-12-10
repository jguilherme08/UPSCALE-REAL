"""
Script para converter modelos RealESRGAN de PyTorch (.pth) para ONNX (.onnx)
Compatível com Vercel serverless.
"""

import os
import sys
import torch
import torch.onnx
import argparse
from pathlib import Path

# Adicionar o Real-ESRGAN ao path para importar as arquiteturas
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'Real-ESRGAN-master'))

from realesrgan.archs.srvgg_arch import SRVGGNetCompact


def convert_pth_to_onnx(pth_path: str, onnx_path: str, scale: int):
    """
    Converte modelo RealESRGAN de .pth para .onnx
    
    Args:
        pth_path: Caminho do arquivo .pth
        onnx_path: Caminho de saída .onnx
        scale: Fator de escala (2 ou 4)
    """
    print(f"Convertendo {pth_path} → {onnx_path} (scale={scale}x)")
    
    # Carregar estado do modelo
    if not os.path.exists(pth_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {pth_path}")
    
    checkpoint = torch.load(pth_path, map_location='cpu')
    
    # Criar instância do modelo
    model = SRVGGNetCompact(
        num_in_ch=3,
        num_out_ch=3,
        num_feat=64,
        num_conv=32,
        upscale=scale,
        act_type='prelu'
    )
    
    # Carregar pesos
    if 'params' in checkpoint:
        model.load_state_dict(checkpoint['params'])
    elif 'params_ema' in checkpoint:
        model.load_state_dict(checkpoint['params_ema'])
    else:
        # Tentar carregar diretamente
        model.load_state_dict(checkpoint)
    
    model.eval()
    model.cpu()
    
    # Criar exemplo de input (batch=1, channels=3, height=64, width=64)
    dummy_input = torch.randn(1, 3, 64, 64, dtype=torch.float32)
    
    # Exportar para ONNX
    os.makedirs(os.path.dirname(onnx_path) if os.path.dirname(onnx_path) else '.', exist_ok=True)
    
    with torch.no_grad():
        torch.onnx.export(
            model,
            dummy_input,
            onnx_path,
            input_names=['image'],
            output_names=['output'],
            opset_version=14,
            export_params=True,
            verbose=False,
            do_constant_folding=True
        )
    
    print(f"✅ Convertido com sucesso: {onnx_path}")


def main():
    parser = argparse.ArgumentParser(description='Converter RealESRGAN .pth para ONNX')
    parser.add_argument('--input-dir', default='python/models', help='Diretório com modelos .pth')
    parser.add_argument('--output-dir', default='python', help='Diretório de saída para .onnx')
    
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    
    if not input_dir.exists():
        print(f"❌ Diretório não encontrado: {input_dir}")
        sys.exit(1)
    
    # Converter cada modelo .pth
    for pth_file in input_dir.glob('RealESRGAN_*.pth'):
        # Extrair escala do nome (RealESRGAN_x2plus.pth → 2)
        scale = int(pth_file.stem.split('_x')[1].split('plus')[0])
        
        onnx_name = f"RealESRGAN_x{scale}plus.onnx"
        onnx_path = output_dir / onnx_name
        
        try:
            convert_pth_to_onnx(str(pth_file), str(onnx_path), scale)
        except Exception as e:
            print(f"❌ Erro ao converter {pth_file}: {e}")
            sys.exit(1)
    
    print("\n✅ Conversão concluída!")


if __name__ == '__main__':
    main()
