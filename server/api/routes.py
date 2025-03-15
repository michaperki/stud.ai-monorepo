
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import random, base64, os, traceback, tempfile, logging
import soundfile as sf

from core.audio import synthesize_speech
from core.ai import transcribe_audio, similarity
from data.vocab import VOCAB

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/next_word")
async def next_word():
    try:
        word = random.choice(list(VOCAB.keys()))
        prompt_audio = synthesize_speech(f"{word}?")
        audio_base64 = base64.b64encode(prompt_audio).decode("utf-8")
        
        logger.debug(f"Selected word: {word}")
        return JSONResponse({"word": word, "audio_base64": audio_base64})
    except Exception as e:
        logger.exception("Error in next_word")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check_answer/{word}")
async def check_answer(word: str, file: UploadFile = File(...)):
    try:
        # Save audio file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_filename = temp_file.name
            content = await file.read()
            temp_file.write(content)

        user_response = transcribe_audio(temp_filename)
        os.unlink(temp_filename)

        if word not in VOCAB:
            raise HTTPException(status_code=400, detail=f"Unknown word: {word}")

        correct_answer = VOCAB[word]
        score = similarity(user_response.lower(), correct_answer.lower())
        is_correct = score > 0.7

        return JSONResponse({
            "user_response": user_response,
            "is_correct": is_correct
        })

    except Exception as e:
        logger.exception("Error in check_answer")
        raise HTTPException(status_code=500, detail=str(e))
