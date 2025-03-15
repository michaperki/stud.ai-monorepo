
import logging
import uvicorn
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from core.config import settings

# Configure global logging (DEBUG level for extra detail)
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)

logger = logging.getLogger(__name__)
logger.info(f"Configured log level: {logging.getLevelName(logger.getEffectiveLevel())}")

# Enable debug=True for extra error details
app = FastAPI(debug=True)

# Optional: if you need a catch-all, uncomment this; otherwise rely on FastAPI's default traceback.
# @app.exception_handler(Exception)
# async def debug_exception_handler(request: Request, exc: Exception):
#     traceback.print_exc()
#     return JSONResponse({"detail": str(exc)}, status_code=500)

# Log each incoming request and outgoing response
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.debug(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.debug(f"Response status: {response.status_code}")
    return response

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

app.include_router(router, prefix="/api")

if __name__ == "__main__":
    logger.info("Starting uvicorn server on http://0.0.0.0:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")

