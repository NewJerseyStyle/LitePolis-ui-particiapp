import unittest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from importlib import import_module
from utils import find_package_name
import os

class TestCore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pkg_name = find_package_name()
        cls.core = import_module(f"{cls.pkg_name}")
        cls.route_name = cls.core.name
        cls.files = cls.core.files
        cls.prefix = cls.core.prefix

        cls.app = FastAPI()
        cls.app.mount(cls.prefix, cls.files, cls.route_name)
        cls.client = TestClient(cls.app)

    def test_read_static_file(self):
        response = self.client.get("/static/index.html")
        self.assertEqual(response.status_code, 200)
        self.assertTrue("<h1>Static File</h1>" in response.text)