# server/main.py (updated version)
import logging
import uvicorn
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from api import router as api_router
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

# Include the API routes with the prefix
app.include_router(api_router, prefix="/api")

# Add a route to list all endpoints - helpful for debugging
@app.get("/api/routes", include_in_schema=False)
async def list_routes():
    """Return a list of all registered routes - useful for debugging"""
    routes = []
    for route in app.routes:
        if hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "name": route.name,
                "methods": list(route.methods)
            })
    return {"routes": routes}

if __name__ == "__main__":
    logger.info("Starting uvicorn server on http://0.0.0.0:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")
