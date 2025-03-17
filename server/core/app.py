
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import router as api_router
from core.config import settings
from core.middleware import log_requests
from core.shutdown import setup_signal_handlers
import logging

def create_app() -> FastAPI:
    """Initialize and configure the FastAPI app."""
    app = FastAPI(debug=True)

    # Configure middleware
    app.middleware("http")(log_requests)

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=86400,
    )

    # Include API routes
    app.include_router(api_router, prefix="/api")

    # List all routes (for debugging)
    @app.get("/api/routes", include_in_schema=False)
    async def list_routes():
        return {"routes": [{"path": r.path, "name": r.name, "methods": list(r.methods)} for r in app.routes if hasattr(r, "methods")]}

    # Setup signal handlers
    setup_signal_handlers()

    return app
