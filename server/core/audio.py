import io
import numpy as np
from gtts import gTTS
import os

def synthesize_speech(text, language_code="iw"):
    """Generate speech from text"""
    tts = gTTS(text=text, lang=language_code, slow=False)
    audio_io = io.BytesIO()
    tts.write_to_fp(audio_io)
    return audio_io.getvalue()

def get_audio_as_base64(filename):
    """Convert audio file to base64 string"""
    import base64
    if os.path.exists(filename):
        with open(filename, "rb") as audio_file:
            return base64.b64encode(audio_file.read()).decode('utf-8')
    return None
