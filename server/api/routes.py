
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import random, base64
from core.audio import synthesize_speech, record_audio
from core.ai import transcribe_audio, similarity
from data.vocab import VOCAB

router = APIRouter()

@router.get("/next_word")
async def next_word():
    word = random.choice(list(VOCAB.keys()))
    prompt_audio = synthesize_speech(f"מה המשמעות של המילה '{word}'?")
    audio_base64 = base64.b64encode(prompt_audio).decode('utf-8')

    return JSONResponse({"word": word, "audio_base64": audio_base64})

@router.post("/check_answer/{word}")
async def check_answer(word: str):
    record_audio()
    user_response = transcribe_audio()

    correct_answer = VOCAB[word]
    is_correct = similarity(user_response.lower(), correct_answer.lower()) > 0.7
    feedback_text = "נכון!" if is_correct else f"לא נכון. התשובה הנכונה היא: {correct_answer}"

    feedback_audio = synthesize_speech(feedback_text)
    feedback_audio_base64 = base64.b64encode(feedback_audio).decode('utf-8')

    return JSONResponse({
        "user_response": user_response,
        "feedback_text": feedback_text,
        "audio_base64": feedback_audio_base64
    })
