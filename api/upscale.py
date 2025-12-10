import base64
import io
import json
from PIL import Image
import numpy as np
import onnxruntime as ort


def handler(request):
    """
    Serverless handler para Vercel
    POST /api/upscale
    Body: {"image": "base64_string", "scale": 2 ou 4}
    Response: {"image": "base64_string_upscaled"}
    """
    if request.method != "POST":
        return {
            "statusCode": 405,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Method Not Allowed"})
        }

    try:
        body = request.get_json() if hasattr(request, 'get_json') else json.loads(request.body)
        image_base64 = body.get("image")
        scale = int(body.get("scale", 2))

        if not image_base64:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "No image provided"})
            }

        if scale not in [2, 4]:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Scale must be 2 or 4"})
            }

        # Decodificar imagem base64
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Preparar input para ONNX
        img_np = np.array(image).astype(np.float32) / 255.0
        img_np = np.transpose(img_np, (2, 0, 1))  # HWC -> CHW
        img_np = np.expand_dims(img_np, 0)  # Add batch dimension

        # Selecionar modelo baseado na escala
        model_path = f"python/RealESRGAN_x{scale}plus.onnx"

        # Executar inference com ONNX Runtime
        session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        input_name = session.get_inputs()[0].name
        output = session.run(None, {input_name: img_np})[0]

        # Pós-processar output
        output = np.squeeze(output)
        output = np.transpose(output, (1, 2, 0))  # CHW -> HWC
        output = (output * 255.0).clip(0, 255).astype(np.uint8)
        out_image = Image.fromarray(output)

        # Retornar como base64
        buffer = io.BytesIO()
        out_image.save(buffer, format="PNG")
        img_b64 = base64.b64encode(buffer.getvalue()).decode()

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"image": img_b64})
        }

    except FileNotFoundError as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": f"Modelo não encontrado: {str(e)}"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }
