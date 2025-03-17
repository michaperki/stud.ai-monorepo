
import uvicorn
import logging
from core.app import create_app
from core.logging_config import configure_logging

# Configure Logging
logger = configure_logging()

# Initialize FastAPI app
app = create_app()

if __name__ == "__main__":
    try:
        logger.info("Starting Uvicorn server on http://0.0.0.0:8000")
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")
    except KeyboardInterrupt:
        logger.info("Server interrupted. Shutting down...")
    except Exception as e:
        logger.error(f"Unexpected error during shutdown: {e}")
    finally:
        logger.info("Uvicorn shutdown complete.")

