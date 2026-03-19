"""Core module for ParticiApp UI serving static files."""

from pathlib import Path
from typing import Dict, Any

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

# Configuration defaults
DEFAULT_CONFIG: Dict[str, Any] = {
    "base_url": "/particiapp",
    "api_base_url": "/api",
}

# Get the directory where static files are located
STATIC_DIR = Path(__file__).parent / "static"

# Create router
router = APIRouter(tags=["ParticiApp UI"])


def get_static_file_path(filename: str) -> Path:
    """Get the full path to a static file."""
    return STATIC_DIR / filename


# Mount static asset directories if they exist
if STATIC_DIR.exists():
    # Mount subdirectories (scripts, images, style, fonts)
    for subdir in ["scripts", "images", "style", "fonts"]:
        subdir_path = STATIC_DIR / subdir
        if subdir_path.exists():
            router.mount(
                f"/{subdir}",
                StaticFiles(directory=str(subdir_path)),
                name=f"particiapp-{subdir}",
            )


@router.get("/", response_class=HTMLResponse)
async def serve_index(request: Request):
    """Serve the main index.html for ParticiApp."""
    index_path = get_static_file_path("index.html")
    if index_path.exists():
        return FileResponse(index_path, media_type="text/html")
    return HTMLResponse(content="<html><body><h1>ParticiApp UI not built</h1><p>Static files not found.</p></body></html>", status_code=404)


@router.get("/privacy", response_class=HTMLResponse)
async def serve_privacy(request: Request):
    """Serve the privacy page."""
    privacy_path = get_static_file_path("privacy.html")
    if privacy_path.exists():
        return FileResponse(privacy_path, media_type="text/html")
    return HTMLResponse(content="<html><body><h1>Privacy page not found</h1></body></html>", status_code=404)


@router.get("/{conversation_id}", response_class=HTMLResponse)
async def serve_conversation(conversation_id: str, request: Request):
    """Serve the conversation page for a specific conversation ID.
    
    The conversation_id is used by the frontend JavaScript to load
    the appropriate conversation from the ParticiAPI backend.
    """
    index_path = get_static_file_path("index.html")
    if index_path.exists():
        return FileResponse(index_path, media_type="text/html")
    return HTMLResponse(content="<html><body><h1>ParticiApp UI not built</h1></body></html>", status_code=404)
