
import sounddevice as sd
import soundfile as sf
import io
from gtts import gTTS

def record_audio(filename="input.wav", duration=4, samplerate=44100):
    audio = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1)
    sd.wait()
    sf.write(filename, audio, samplerate)

def synthesize_speech(text, language_code="iw"):
    tts = gTTS(text=text, lang=language_code, slow=False)
    audio_io = io.BytesIO()
    tts.write_to_fp(audio_io)
    return audio_io.getvalue()

