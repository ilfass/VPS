#!/usr/bin/env python3
"""
Servicio de Text-to-Speech usando Coqui TTS / XTTS
Clona la voz del usuario y genera audio en español
"""

import sys
import json
import os
from pathlib import Path

# Intentar importar TTS (si no está instalado, dar instrucciones)
try:
    from TTS.api import TTS
except ImportError:
    print(json.dumps({
        "error": "TTS no instalado",
        "message": "Instala con: pip install TTS",
        "install_command": "pip install TTS"
    }))
    sys.exit(1)

# Configuración
VOICE_SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "voice", "voice_sample.wav")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "audio", "generated")
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"

# Asegurar que el directorio de salida existe
os.makedirs(OUTPUT_DIR, exist_ok=True)

def init_tts():
    """Inicializa el modelo TTS (solo una vez)"""
    try:
        print("Cargando modelo XTTS...", file=sys.stderr)
        tts = TTS(MODEL_NAME)
        print("Modelo cargado correctamente", file=sys.stderr)
        return tts
    except Exception as e:
        print(f"Error cargando modelo: {e}", file=sys.stderr)
        return None

# Modelo global (se carga una vez)
_tts_model = None

def get_tts():
    """Obtiene el modelo TTS (singleton)"""
    global _tts_model
    if _tts_model is None:
        _tts_model = init_tts()
    return _tts_model

def generate_speech(text, output_filename=None):
    """
    Genera audio a partir de texto usando voz clonada
    
    Args:
        text: Texto a convertir a voz
        output_filename: Nombre del archivo de salida (opcional)
    
    Returns:
        dict con 'success', 'file_path' o 'error'
    """
    # Validar que existe la muestra de voz
    if not os.path.exists(VOICE_SAMPLE_PATH):
        return {
            "error": "Muestra de voz no encontrada",
            "message": f"Coloca tu grabación de voz en: {VOICE_SAMPLE_PATH}",
            "required_format": "WAV, 16kHz, mono, 10-30 segundos"
        }
    
    # Obtener modelo TTS
    tts = get_tts()
    if tts is None:
        return {
            "error": "Modelo TTS no disponible",
            "message": "No se pudo cargar el modelo XTTS"
        }
    
    # Generar nombre de archivo si no se proporciona
    if output_filename is None:
        import hashlib
        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        output_filename = f"tts_{text_hash}.wav"
    
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    try:
        # Generar audio
        print(f"Generando audio para: {text[:50]}...", file=sys.stderr)
        
        tts.tts_to_file(
            text=text,
            speaker_wav=VOICE_SAMPLE_PATH,
            language="es",
            file_path=output_path
        )
        
        # Verificar que el archivo se creó
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            return {
                "success": True,
                "file_path": output_path,
                "url": f"/assets/audio/generated/{output_filename}",
                "file_size": file_size
            }
        else:
            return {
                "error": "Archivo no generado",
                "message": "El proceso completó pero no se encontró el archivo"
            }
            
    except Exception as e:
        return {
            "error": "Error generando audio",
            "message": str(e)
        }

def main():
    """Punto de entrada principal"""
    if len(sys.argv) < 2:
        # Modo interactivo o API
        try:
            # Leer JSON del stdin
            input_data = json.loads(sys.stdin.read())
            text = input_data.get("text", "")
            
            if not text:
                print(json.dumps({"error": "Texto requerido"}))
                sys.exit(1)
            
            result = generate_speech(text, input_data.get("output_filename"))
            print(json.dumps(result))
            
        except json.JSONDecodeError:
            # Modo simple: texto como argumento
            if len(sys.argv) == 2:
                text = sys.argv[1]
                result = generate_speech(text)
                print(json.dumps(result))
            else:
                print(json.dumps({
                    "error": "Uso incorrecto",
                    "usage": "python tts-service.py 'texto a convertir'",
                    "or": "echo '{\"text\":\"...\"}' | python tts-service.py"
                }))
                sys.exit(1)
    else:
        # Modo simple: texto como argumento
        text = sys.argv[1]
        result = generate_speech(text)
        print(json.dumps(result))

if __name__ == "__main__":
    main()
