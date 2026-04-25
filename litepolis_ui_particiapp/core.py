"""Core module for ParticiApp UI serving static files."""

from pathlib import Path
from typing import Dict, Any

from fastapi import APIRouter, Request
from fastapi import HTTPException
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
prefix = __name__.split('.')[-2]
prefix = '_'.join(prefix.split('_')[2:])
dependencies = []


def get_static_file_path(filename: str) -> Path:
    """Get the full path to a static file."""
    return STATIC_DIR / filename


# Mount static asset directories if they exist
if STATIC_DIR.exists():
    _ALLOWED_SUBDIRS = {"scripts", "images", "style", "fonts"}

    @router.get("/{subdir}/{path:path}", include_in_schema=False)
    async def _serve_asset(subdir: str, path: str):
        if subdir not in _ALLOWED_SUBDIRS:
            raise HTTPException(404)
        target = (STATIC_DIR / subdir / path).resolve()
        if not str(target).startswith(str(STATIC_DIR.resolve())):
            raise HTTPException(404)  # path-traversal guard
        if not target.is_file():
            raise HTTPException(404)
        return FileResponse(target)


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
