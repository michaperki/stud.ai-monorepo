
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
        original_filename = file.filename.lower()
        suffix = ".webm" if original_filename.endswith(".webm") else ".wav"

        logger.debug(f"Incoming file: {file.filename} -> using suffix {suffix}")

        # Save the uploaded file to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_filename = temp_file.name
            content = await file.read()
            temp_file.write(content)

        file_size = len(content)
        logger.info(f"Saved uploaded audio to {temp_filename} (size={file_size} bytes)")

        # Attempt to read as WAV (only works if it's truly WAV)
        try:
            data, samplerate = sf.read(temp_filename)
            logger.debug(f"Audio sample rate={samplerate}, frames={len(data)}")
        except Exception as e:
            logger.warning(f"Cannot parse file with soundfile (likely webm): {e}")

        # Transcribe with actual temp_filename
        logger.debug(f"Starting OpenAI transcription for: {temp_filename}")
        user_response = transcribe_audio(temp_filename)
        logger.info(f"Transcription: {user_response}")

        # Validate word
        if word not in VOCAB:
            logger.error(f"Unknown word requested: {word}")
            raise HTTPException(status_code=400, detail=f"Unknown word: {word}")

        correct_answer = VOCAB[word]
        score = similarity(user_response.lower(), correct_answer.lower())
        is_correct = score > 0.7
        feedback_text = "נכון!" if is_correct else f"לא נכון. התשובה היא: {correct_answer}"

        logger.debug(f"Similarity score={score:.2f}, is_correct={is_correct}")

        # Generate feedback speech
        feedback_audio = synthesize_speech(feedback_text)
        feedback_audio_base64 = base64.b64encode(feedback_audio).decode("utf-8")

        # Clean up
        os.unlink(temp_filename)
        logger.debug("Temp file removed")

        return JSONResponse({
            "user_response": user_response,
            "feedback_text": feedback_text,
            "audio_base64": feedback_audio_base64,
            "is_correct": is_correct,
        })

    except Exception as e:
        logger.exception("Error in check_answer")
        raise HTTPException(status_code=500, detail=str(e))

