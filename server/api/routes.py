# server/api/routes.py

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Response
from fastapi.responses import JSONResponse
import random, base64, os, traceback, tempfile, logging
import soundfile as sf
from typing import List, Optional

from core.audio import synthesize_speech
from core.ai import transcribe_audio, similarity
from core.config import settings
from data.vocab import WordCategory, DifficultyLevel, VocabWord, get_all_words, get_words_by_category, get_words_by_difficulty, get_random_words, VOCAB, REV_VOCAB

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/next_word")
async def next_word(
    lang: str = Query("iw"),
    category: Optional[str] = Query(None, description="Filter by word category (noun, verb, etc.)"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty level (beginner, intermediate, advanced)"),
    exclude: Optional[str] = Query(None, description="Comma-separated list of Hebrew words to exclude")
):
    try:
        # Parse filters if provided
        word_category = None
        difficulty_level = None
        exclude_words = []
        
        if category:
            try:
                word_category = WordCategory(category)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
                
        if difficulty:
            try:
                difficulty_level = DifficultyLevel(difficulty)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid difficulty level: {difficulty}")
                
        if exclude:
            exclude_words = exclude.split(",")
        
        # Get a random word with filters
        selected_words = get_random_words(
            count=1,
            category=word_category,
            difficulty=difficulty_level,
            exclude_words=exclude_words
        )
        
        if not selected_words:
            # If no words match the filters, fall back to a completely random word
            logger.warning(f"No words found with filters: category={category}, difficulty={difficulty}")
            selected_words = get_random_words(count=1)
            
            # If still no words (shouldn't happen but just in case)
            if not selected_words:
                raise HTTPException(
                    status_code=404, 
                    detail="No vocabulary words available"
                )
        
        selected_word = selected_words[0]
        hebrew_word = selected_word.hebrew
        english_meaning = selected_word.english
        
        # Decide which text to speak & return based on lang
        if lang == "en":
            # Use the English meaning for TTS and the "word" field
            text_for_tts = f"{english_meaning}?"
            response_word = english_meaning
        else:
            # Default: Hebrew TTS
            text_for_tts = f"{hebrew_word}?"
            response_word = hebrew_word
        
        # Generate audio
        prompt_audio = synthesize_speech(text_for_tts, language_code=lang)
        audio_base64 = base64.b64encode(prompt_audio).decode("utf-8")

        # Log what's being sent
        logger.debug(f"Selected word: {hebrew_word}, lang={lang}, tts='{text_for_tts}'")
        
        # Build enhanced response with word metadata
        return JSONResponse({
            "word": response_word,       # Either Hebrew or English
            "audio_base64": audio_base64,
            "audio_settings": settings.AUDIO_SETTINGS,  # Include audio settings in response
            "metadata": {
                "hebrew": hebrew_word,
                "english": english_meaning,
                "category": selected_word.category,
                "difficulty": selected_word.difficulty,
                "pronunciation_guide": selected_word.pronunciation_guide,
                "example_sentence": selected_word.example_sentence
            }
        })
    except Exception as e:
        logger.exception("Error in next_word")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vocabulary/categories")
async def get_categories():
    """Get all available word categories"""
    try:
        return JSONResponse({
            "categories": [category.value for category in WordCategory]
        })
    except Exception as e:
        logger.exception("Error in get_categories")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vocabulary/difficulty_levels")
async def get_difficulty_levels():
    """Get all available difficulty levels"""
    try:
        return JSONResponse({
            "difficulty_levels": [level.value for level in DifficultyLevel]
        })
    except Exception as e:
        logger.exception("Error in get_difficulty_levels")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vocabulary")
async def get_vocabulary(
    category: Optional[str] = Query(None, description="Filter by word category"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty level"),
    search: Optional[str] = Query(None, description="Search by Hebrew or English text"),
    limit: int = Query(50, description="Maximum number of words to return")
):
    """Get vocabulary words with optional filters"""
    try:
        # Start with all words
        words = get_all_words()
        
        # Apply filters
        if category:
            try:
                word_category = WordCategory(category)
                words = [word for word in words if word.category == word_category]
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        
        if difficulty:
            try:
                difficulty_level = DifficultyLevel(difficulty)
                words = [word for word in words if word.difficulty == difficulty_level]
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid difficulty level: {difficulty}")
        
        if search:
            search = search.lower()
            words = [
                word for word in words 
                if search in word.hebrew.lower() or search in word.english.lower()
            ]
        
        # Limit results and convert to dictionary
        limited_words = words[:limit]
        result = [word.to_dict() for word in limited_words]
        
        return JSONResponse({
            "total": len(words),
            "returned": len(limited_words),
            "words": result
        })
    except Exception as e:
        logger.exception("Error in get_vocabulary")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vocabulary/stats")
async def get_vocabulary_stats():
    """Get vocabulary statistics by category and difficulty"""
    try:
        all_words = get_all_words()
        
        # Count words by category
        category_counts = {}
        for category in WordCategory:
            category_counts[category.value] = len([w for w in all_words if w.category == category])
            
        # Count words by difficulty
        difficulty_counts = {}
        for difficulty in DifficultyLevel:
            difficulty_counts[difficulty.value] = len([w for w in all_words if w.difficulty == difficulty])
            
        # Count words by category and difficulty combined
        combined_counts = {}
        for category in WordCategory:
            combined_counts[category.value] = {}
            for difficulty in DifficultyLevel:
                count = len([
                    w for w in all_words 
                    if w.category == category and w.difficulty == difficulty
                ])
                combined_counts[category.value][difficulty.value] = count
                
        return JSONResponse({
            "total_words": len(all_words),
            "by_category": category_counts,
            "by_difficulty": difficulty_counts,
            "by_category_and_difficulty": combined_counts
        })
    except Exception as e:
        logger.exception("Error in get_vocabulary_stats")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check_answer/{word}")
async def check_answer(word: str, file: UploadFile = File(...)):
    try:
        # Save audio file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_filename = temp_file.name
            content = await file.read()
            temp_file.write(content)
        
        # Find the word in our vocabulary
        all_words = get_all_words()
        word_obj = next((w for w in all_words if w.hebrew == word or w.english == word), None)
        
        if word_obj:
            if word == word_obj.hebrew:
                # Hebrew word provided, expecting English answer
                correct_answer = word_obj.english
                transcription_language = "en"
            else:
                # English word provided, expecting Hebrew answer
                correct_answer = word_obj.hebrew
                transcription_language = "he"
        else:
            # Fall back to the legacy dictionary lookup
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
            return re.sub(r"[^\w\s]", "", text).strip().lower()
        
        normalized_user_response = normalize_text(user_response)
        normalized_correct_answer = normalize_text(correct_answer)

        # Calculate similarity score
        score = similarity(normalized_user_response, normalized_correct_answer)
        is_correct = score > 0.7

        # Determine pronunciation score (simple mapping from similarity score)
        pronunciation_score = int(score * 100)
        
        # Build response with optional metadata
        response = {
            "user_response": user_response,
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "pronunciation_score": pronunciation_score
        }
        
        # Add metadata if we have the word in our enhanced vocabulary
        if word_obj:
            response["metadata"] = {
                "hebrew": word_obj.hebrew,
                "english": word_obj.english,
                "category": word_obj.category,
                "difficulty": word_obj.difficulty,
                "pronunciation_guide": word_obj.pronunciation_guide,
                "example_sentence": word_obj.example_sentence
            }

        return JSONResponse(response)

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
