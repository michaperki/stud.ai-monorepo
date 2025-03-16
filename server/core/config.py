import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    # Expanded CORS origins to ensure all development environments are covered
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "https://127.0.0.1:3000",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:5173",  # Vite default
        "*"  # Allow all origins - only for development, remove in production
    ]
    
    # Audio recording settings
    AUDIO_SETTINGS = {
        "silence_threshold": 15,     # Higher value = less sensitive to background noise (0-100)
        "silence_duration": 1000,    # Time in ms of silence before stopping recording
        "min_recording_time": 500,   # Minimum recording time in ms to prevent premature cutoff
        "max_recording_time": 8000,  # Maximum recording time in ms
    }

settings = Settings()
