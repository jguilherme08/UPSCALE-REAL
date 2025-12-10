"""
Gerador de modelo ONNX mock para testes
Cria um modelo ONNX válido sem precisar do PyTorch
"""
import numpy as np
try:
    import onnx
    from onnx import helper, TensorProto
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    print("⚠️  onnx não instalado. Instalando...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "onnx"])
    import onnx
    from onnx import helper, TensorProto
    ONNX_AVAILABLE = True

def create_upscale_onnx():
    """
    Cria um modelo ONNX simples para upscaling 2x
    Input: [1, H, W, 3] float32
    Output: [1, H*2, W*2, 3] float32
    """
    
    # Definir input
    input_tensor = helper.make_tensor_value_info(
        'input', TensorProto.FLOAT, [1, None, None, 3]
    )
    
    # Definir output  
    output_tensor = helper.make_tensor_value_info(
        'output', TensorProto.FLOAT, [1, None, None, 3]
    )
    
    # Criar node de resize (upscale 2x usando interpolação)
    # ROI vazio
    roi = helper.make_tensor(
        'roi', TensorProto.FLOAT, [0], []
    )
    
    # Scales para 2x em height e width
    scales = helper.make_tensor(
        'scales', TensorProto.FLOAT, [4], [1.0, 2.0, 2.0, 1.0]
    )
    
    resize_node = helper.make_node(
        'Resize',
        inputs=['input', 'roi', 'scales'],
        outputs=['output'],
        mode='linear',
        coordinate_transformation_mode='half_pixel'
    )
    
    # Criar grafo
    graph = helper.make_graph(
        [resize_node],
        'upscale_model',
        [input_tensor],
        [output_tensor],
        [roi, scales]
    )
    
    # Criar modelo
    model = helper.make_model(graph, producer_name='upscaler')
    model.opset_import[0].version = 11
    
    # Salvar
    output_path = "../image-upscaler/public/model.onnx"
    onnx.save(model, output_path)
    
    print(f"✅ Modelo ONNX criado em: {output_path}")
    print("📦 Formato: NHWC [1, H, W, 3] -> [1, H*2, W*2, 3]")
    print("🚀 Pronto para usar com onnxruntime-node!")

if __name__ == '__main__':
    create_upscale_onnx()
