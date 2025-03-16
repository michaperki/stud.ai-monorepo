from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse
import random, base64, os, traceback, tempfile, logging
import soundfile as sf

from core.audio import synthesize_speech
from core.ai import transcribe_audio, similarity
from core.config import settings
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
            "audio_base64": audio_base64,
            "audio_settings": settings.AUDIO_SETTINGS  # Include audio settings in response
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

@router.get("/get_audio_settings")
async def get_audio_settings():
    """Return the current audio recording settings"""
    try:
        return JSONResponse(settings.AUDIO_SETTINGS)
    except Exception as e:
        logger.exception("Error in get_audio_settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_pronunciation")
async def get_pronunciation(word: str = Query(...), lang: str = Query("iw")):
    """Get pronunciation audio for a specific word"""
    try:
        logger.debug(f"Pronunciation request received for word: '{word}', language: '{lang}'")
        
        # For Hebrew words that need English pronunciation
        if lang == "en":
            # Check if this is a Hebrew word in our vocabulary
            if word in VOCAB:
                # Get the English translation
                english_word = VOCAB[word]
                logger.debug(f"Found Hebrew word in vocabulary, translating to English: '{english_word}'")
                
                # Generate audio with English voice saying the English word
                pronunciation_audio = synthesize_speech(english_word, language_code="en")
                logger.debug(f"Generated ENGLISH pronunciation for '{english_word}'")
            else:
                # If not in vocabulary, try direct pronunciation (but this may not work well)
                logger.debug(f"Word not found in Hebrew vocabulary, trying direct pronunciation")
                pronunciation_audio = synthesize_speech(word, language_code="en")
                logger.debug(f"Generated direct English pronunciation for '{word}'")
        
        # For English words that need Hebrew pronunciation
        elif lang == "iw":
            # Check if this is an English word in our reverse vocabulary
            if word in REV_VOCAB:
                # Get the Hebrew translation
                hebrew_word = REV_VOCAB[word]
                logger.debug(f"Found English word in vocabulary, translating to Hebrew: '{hebrew_word}'")
                
                # Generate audio with Hebrew voice saying the Hebrew word
                pronunciation_audio = synthesize_speech(hebrew_word, language_code="iw")
                logger.debug(f"Generated HEBREW pronunciation for '{hebrew_word}'")
            else:
                # If not in vocabulary, try direct pronunciation
                logger.debug(f"Word not found in English vocabulary, trying direct pronunciation")
                pronunciation_audio = synthesize_speech(word, language_code="iw")
                logger.debug(f"Generated direct Hebrew pronunciation for '{word}'")
        
        # Return the audio as base64
        audio_base64 = base64.b64encode(pronunciation_audio).decode("utf-8")
        
        return JSONResponse({
            "word": word,
            "audio_base64": audio_base64
        })
    except Exception as e:
        logger.exception(f"Error in get_pronunciation for word: {word}, lang: {lang}")
        raise HTTPException(status_code=500, detail=str(e))
