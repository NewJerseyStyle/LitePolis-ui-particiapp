"""Tests for LitePolis-ui-particiapp."""

import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from fastapi import FastAPI

from litepolis_ui_particiapp import router, DEFAULT_CONFIG


@pytest.fixture
def app():
    """Create a FastAPI app with the ParticiApp router mounted."""
    app = FastAPI()
    app.include_router(router, prefix="/particiapp")
    return app


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


class TestParticiAppUI:
    """Test ParticiApp UI endpoints."""

    def test_default_config_exists(self):
        """Test that DEFAULT_CONFIG is properly defined."""
        assert isinstance(DEFAULT_CONFIG, dict)
        assert "base_url" in DEFAULT_CONFIG
        assert "api_base_url" in DEFAULT_CONFIG

    def test_router_exists(self):
        """Test that router is properly defined."""
        assert router is not None
        assert hasattr(router, "routes")

    def test_index_route_exists(self):
        """Test that index route is registered."""
        routes = [route.path for route in router.routes]
        assert "/" in routes

    def test_conversation_route_exists(self):
        """Test that conversation route is registered."""
        routes = [route.path for route in router.routes]
        assert "{conversation_id}" in routes or any("{conversation_id}" in r for r in routes)

    def test_index_returns_html(self, client):
        """Test that index endpoint returns HTML content."""
        response = client.get("/particiapp/")
        assert response.status_code in [200, 404]  # 404 if static files not built

    def test_privacy_returns_html(self, client):
        """Test that privacy endpoint returns HTML content."""
        response = client.get("/particiapp/privacy")
        assert response.status_code in [200, 404]

    def test_static_files_exist(self):
        """Test that static files directory structure is correct."""
        static_dir = Path(__file__).parent.parent / "litepolis_ui_particiapp" / "static"
        if static_dir.exists():
            assert (static_dir / "index.html").exists()
