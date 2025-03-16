
import openai
from difflib import SequenceMatcher
from core.config import settings

openai.api_key = settings.OPENAI_API_KEY

def transcribe_audio(filename, language="he"):
    with open(filename, "rb") as audio_file:
        transcription = openai.Audio.transcribe("whisper-1", audio_file, language=language)
    return transcription["text"].strip()

def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()

