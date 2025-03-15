
import openai
from difflib import SequenceMatcher
from core.config import settings

openai.api_key = settings.OPENAI_API_KEY

def transcribe_audio(filename):
    """
    Actually use the passed filename. Removed the default of 'input.wav'.
    """
    with open(filename, "rb") as audio_file:
        transcription = openai.Audio.transcribe("whisper-1", audio_file)
    return transcription['text'].lower().strip()

def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()

