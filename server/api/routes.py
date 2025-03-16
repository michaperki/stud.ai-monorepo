
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse
import random, base64, os, traceback, tempfile, logging
import soundfile as sf

from core.audio import synthesize_speech
from core.ai import transcribe_audio, similarity
from data.vocab import VOCAB, REV_VOCAB

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/next_word")
async def next_word(lang: str = Query("iw")):
    try:
        # 1) Pick a random Hebrew word
        hebrew_word = random.choice(list(VOCAB.keys()))
        english_meaning = VOCAB[hebrew_word]

        # 2) Decide which text to speak & return based on lang
        if lang == "en":
            # Use the English meaning for TTS and the "word" field
            text_for_tts = f"{english_meaning}?"
            response_word = english_meaning
        else:
            # Default: Hebrew TTS
            text_for_tts = f"{hebrew_word}?"
            response_word = hebrew_word

        prompt_audio = synthesize_speech(text_for_tts, language_code=lang)
        audio_base64 = base64.b64encode(prompt_audio).decode("utf-8")

        logger.debug(f"Selected word: {hebrew_word}, lang={lang}, tts='{text_for_tts}'")
        return JSONResponse({
            "word": response_word,       # Either Hebrew or English
            "audio_base64": audio_base64
        })
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
        
        # Determine expected transcription language and correct answer
        if word in VOCAB:
            correct_answer = VOCAB[word]
            transcription_language = "en"
        elif word in REV_VOCAB:
            correct_answer = REV_VOCAB[word]
            transcription_language = "he"
        else:
            os.unlink(temp_filename)
            raise HTTPException(status_code=400, detail=f"Unknown word: {word}")
        
        # Transcribe the audio with the selected language
        user_response = transcribe_audio(temp_filename, language=transcription_language)
        os.unlink(temp_filename)

        # Normalize texts by removing punctuation to avoid minor differences (e.g., trailing '?')
        import re
        def normalize_text(text):
            return re.sub(r"[^\w\s]", "", text).strip()
        
        normalized_user_response = normalize_text(user_response.lower())
        normalized_correct_answer = normalize_text(correct_answer.lower())

        score = similarity(normalized_user_response, normalized_correct_answer)
        is_correct = score > 0.7

        return JSONResponse({
            "user_response": user_response,
            "is_correct": is_correct,
            "correct_answer": correct_answer
        })

    except Exception as e:
        logger.exception("Error in check_answer")
        raise HTTPException(status_code=500, detail=str(e))
