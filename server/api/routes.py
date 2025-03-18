
# server/api/routes.py

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Response, Request
from fastapi.responses import JSONResponse
import random, base64, os, traceback, tempfile, logging
import mimetypes
from pathlib import Path

import soundfile as sf
from pydub import AudioSegment

from core.audio import synthesize_speech
from core.ai import transcribe_audio, similarity
from core.config import settings
from data.vocab import WordCategory, DifficultyLevel, VocabWord, get_all_words, get_words_by_category, get_words_by_difficulty, get_random_words, VOCAB, REV_VOCAB

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Added function for improved audio format detection ---
import magic  # Ensure python-magic or python-magic-bin is installed

def determine_audio_format(file_content, filename=None, content_type=None):
    """
    Determine the audio format using multiple methods:
    1. Check content_type
    2. Try to detect from the file extension
    3. Use python-magic to detect the file type from its content
    """
    format_from_content_type = None
    format_from_extension = None
    format_from_magic = None

    if content_type:
        format_from_content_type = content_type.split('/')[-1].lower()
        if format_from_content_type == 'mp4':
            format_from_content_type = 'm4a'
    
    if filename:
        _, ext = os.path.splitext(filename)
        if ext:
            format_from_extension = ext[1:].lower()
    
    try:
        mime = magic.Magic(mime=True)
        detected_mime = mime.from_buffer(file_content[:4096])
        if detected_mime.startswith('audio/'):
            format_from_magic = detected_mime.split('/')[-1].lower()
    except Exception as e:
        logger.error(f"Error using magic to detect file type: {e}")
    
    logger.debug(f"Format detection: content_type={format_from_content_type}, extension={format_from_extension}, magic={format_from_magic}")
    return format_from_magic or format_from_extension or format_from_content_type

@router.get("/next_word")
async def next_word(
    lang: str = Query("iw"),
    category: str = Query(None, description="Filter by word category (noun, verb, etc.)"),
    difficulty: str = Query(None, description="Filter by difficulty level (beginner, intermediate, advanced)"),
    exclude: str = Query(None, description="Comma-separated list of Hebrew words to exclude")
):
    try:
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
        
        selected_words = get_random_words(
            count=1,
            category=word_category,
            difficulty=difficulty_level,
            exclude_words=exclude_words
        )
        
        if not selected_words:
            logger.warning(f"No words found with filters: category={category}, difficulty={difficulty}")
            selected_words = get_random_words(count=1)
            if not selected_words:
                raise HTTPException(status_code=404, detail="No vocabulary words available")
        
        selected_word = selected_words[0]
        hebrew_word = selected_word.hebrew
        english_meaning = selected_word.english
        
        if lang == "en":
            text_for_tts = f"{english_meaning}?"
            response_word = english_meaning
        else:
            text_for_tts = f"{hebrew_word}?"
            response_word = hebrew_word
        
        prompt_audio = synthesize_speech(text_for_tts, language_code=lang)
        audio_base64 = base64.b64encode(prompt_audio).decode("utf-8")
        logger.debug(f"Selected word: {hebrew_word}, lang={lang}, tts='{text_for_tts}'")
        
        return JSONResponse({
            "word": response_word,
            "audio_base64": audio_base64,
            "audio_settings": settings.AUDIO_SETTINGS,
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
    try:
        return JSONResponse({
            "categories": [category.value for category in WordCategory]
        })
    except Exception as e:
        logger.exception("Error in get_categories")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vocabulary/difficulty_levels")
async def get_difficulty_levels():
    try:
        return JSONResponse({
            "difficulty_levels": [level.value for level in DifficultyLevel]
        })
    except Exception as e:
        logger.exception("Error in get_difficulty_levels")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vocabulary")
async def get_vocabulary(
    category: str = Query(None, description="Filter by word category"),
    difficulty: str = Query(None, description="Filter by difficulty level"),
    search: str = Query(None, description="Search by Hebrew or English text"),
    limit: int = Query(50, description="Maximum number of words to return")
):
    try:
        words = get_all_words()
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
    try:
        all_words = get_all_words()
        category_counts = {}
        for category in WordCategory:
            category_counts[category.value] = len([w for w in all_words if w.category == category])
            
        difficulty_counts = {}
        for difficulty in DifficultyLevel:
            difficulty_counts[difficulty.value] = len([w for w in all_words if w.difficulty == difficulty])
            
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

@router.post("/check_answer/{word:path}")
async def check_answer(word: str, file: UploadFile = File(...), request: Request = None):
    temp_files = []  # Track temp files for cleanup
    try:
        logger.debug(f"Received audio file: {file.filename}, content_type: {file.content_type}")
        
        content = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as temp_file:
            temp_filename = temp_file.name
            temp_files.append(temp_filename)
            temp_file.write(content)
        
        # Detect if this is an iOS device request based on file info
        is_ios = (
            file.content_type and 'quicktime' in file.content_type.lower() or
            (file.filename and file.filename.lower().endswith(('.caf', '.m4a', '.mov'))) or
            'iOS' in request.headers.get('User-Agent', '')
        )
        
        logger.debug(f"iOS device detected: {is_ios}")
        
        # Always convert the audio to ensure compatibility
        # This is more robust than trying to detect the format
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as mp3_file:
                converted_filename = mp3_file.name
                temp_files.append(converted_filename)
            
            import subprocess
            # Use more flexible ffmpeg parameters for iOS media
            cmd = [
                "ffmpeg", "-y", 
                "-f", "auto",  # Auto-detect input format
                "-i", temp_filename, 
                "-acodec", "libmp3lame", 
                "-ab", "128k", 
                "-ac", "1",  # Convert to mono
                "-ar", "44100",  # Standard sample rate
                converted_filename
            ]
            
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            stdout, stderr = process.communicate()
            
            if process.returncode != 0:
                logger.error(f"FFmpeg conversion failed: {stderr.decode()}")
                # Fall back to pydub if ffmpeg fails
                try:
                    from pydub import AudioSegment
                    # Let pydub try to determine format automatically
                    audio = AudioSegment.from_file(temp_filename)
                    audio.export(converted_filename, format="mp3")
                    logger.debug("Converted audio using pydub as fallback")
                except Exception as pydub_error:
                    logger.error(f"Pydub conversion also failed: {str(pydub_error)}")
                    raise Exception(f"Audio conversion failed: {str(pydub_error)}")
            
            logger.debug(f"Converted audio to MP3: {converted_filename}")
            transcription_file = converted_filename
        except Exception as conversion_error:
            logger.error(f"Error converting audio: {conversion_error}")
            raise HTTPException(status_code=500, detail=f"Failed to process audio file: {str(conversion_error)}")
        
        all_words = get_all_words()
        word_obj = next((w for w in all_words if w.hebrew == word or w.english == word), None)
        
        if word_obj:
            if word == word_obj.hebrew:
                correct_answer = word_obj.english
                transcription_language = "en"
            else:
                correct_answer = word_obj.hebrew
                transcription_language = "he"
        else:
            if word in VOCAB:
                correct_answer = VOCAB[word]
                transcription_language = "en"
            elif word in REV_VOCAB:
                correct_answer = REV_VOCAB[word]
                transcription_language = "he"
            else:
                for temp_file in temp_files:
                    try:
                        os.unlink(temp_file)
                    except:
                        pass
                raise HTTPException(status_code=400, detail=f"Unknown word: {word}")
        
        try:
            logger.debug(f"Transcribing audio file: {transcription_file}, language: {transcription_language}")
            user_response = transcribe_audio(transcription_file, language=transcription_language)
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to transcribe audio: {str(e)}")
        
        import re
        def normalize_text(text):
            return re.sub(r"[^\w\s]", "", text).strip().lower()
        
        normalized_user_response = normalize_text(user_response)
        normalized_correct_answer = normalize_text(correct_answer)
        score = similarity(normalized_user_response, normalized_correct_answer)
        is_correct = score > 0.7
        pronunciation_score = int(score * 100)
        
        response = {
            "user_response": user_response,
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "pronunciation_score": pronunciation_score
        }
        
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
        logger.exception(f"Error in check_answer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except Exception as e:
                logger.error(f"Error deleting temporary file {temp_file}: {str(e)}")
@router.get("/get_audio_settings")
async def get_audio_settings():
    try:
        return JSONResponse(settings.AUDIO_SETTINGS)
    except Exception as e:
        logger.exception("Error in get_audio_settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_audio_settings")
async def get_audio_settings():
    try:
        return JSONResponse(settings.AUDIO_SETTINGS)
    except Exception as e:
        logger.exception("Error in get_audio_settings")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_pronunciation")
async def get_pronunciation(word: str = Query(...), lang: str = Query("iw")):
    try:
        logger.debug(f"Pronunciation request received for word: '{word}', language: '{lang}'")
        if lang == "en":
            if word in VOCAB:
                english_word = VOCAB[word]
                logger.debug(f"Found Hebrew word in vocabulary, translating to English: '{english_word}'")
                pronunciation_audio = synthesize_speech(english_word, language_code="en")
                logger.debug(f"Generated ENGLISH pronunciation for '{english_word}'")
            else:
                logger.debug(f"Word not found in Hebrew vocabulary, trying direct pronunciation")
                pronunciation_audio = synthesize_speech(word, language_code="en")
                logger.debug(f"Generated direct English pronunciation for '{word}'")
        elif lang == "iw":
            if word in REV_VOCAB:
                hebrew_word = REV_VOCAB[word]
                logger.debug(f"Found English word in vocabulary, translating to Hebrew: '{hebrew_word}'")
                pronunciation_audio = synthesize_speech(hebrew_word, language_code="iw")
                logger.debug(f"Generated HEBREW pronunciation for '{hebrew_word}'")
            else:
                logger.debug(f"Word not found in English vocabulary, trying direct pronunciation")
                pronunciation_audio = synthesize_speech(word, language_code="iw")
                logger.debug(f"Generated direct Hebrew pronunciation for '{word}'")
        
        audio_base64 = base64.b64encode(pronunciation_audio).decode("utf-8")
        return JSONResponse({
            "word": word,
            "audio_base64": audio_base64
        })
    except Exception as e:
        logger.exception(f"Error in get_pronunciation for word: {word}, lang: {lang}")
        raise HTTPException(status_code=500, detail=str(e))
