import os
from fastapi import APIRouter
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from litepolis import get_config

prefix = "/static"
DEFAULT_CONFIG = {}

static_dir = os.path.join(os.path.dirname(__file__), "static")
files = StaticFiles(directory=static_dir)
name = "static"