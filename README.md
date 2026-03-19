# Getting Started with LitePolis UI Module Development

This template helps you kickstart the creation of user interface modules for the LitePolis platform. It provides a foundational structure and illustrative code to guide you in building your UI.

> :warning: **Important Naming Convention:** When naming your package and its internal directories, ensure they are prefixed with `litepolis-ui-` and `litepolis_ui_`, respectively. This convention is crucial for LitePolis to correctly identify and deploy your module.

## Setting Up Your UI Module

### 1. Configuring Your Package Metadata (`pyproject.toml`)

```toml
[project]
name = "litepolis-ui-template"
version = "0.0.1"
authors = [
    { name = "Your name" },
]
description = "The user interface template module for LitePolis"
dependencies = [
    "fastapi",
    "litepolis",
]

[project.urls]
Homepage = "https://github.com/change-to-your-repo"
```

### 2. Implementing Your UI Logic (`litepolis_ui_template/core.py`)

The `core.py` file within your module's directory is where the main logic for your UI resides.

* **`DEFAULT_CONFIG` Dictionary:** In case any config you need for the UI module.

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

DEFAULT_CONFIG = {
    "default_language": "en"
    # Add your UI-specific default configurations here
}

app = FastAPI()
# Assuming your static files are in a directory named 'static'
app.mount("/static", StaticFiles(directory="static"), name="static")
```

**Important:** Ensure the path specified in `StaticFiles(directory="...")` correctly points to the directory containing your UI's static assets.

### 3. Writing Tests for Your UI Module (`tests/test_core.py`)

Writing thorough tests is essential to ensure your UI module functions correctly. The `tests/test_core.py` file provides a starting point for your tests.

```python
from fastapi.testclient import TestClient
from your_package_name.core import app, DEFAULT_CONFIG  # Adjust import

def test_read_main():
    client = TestClient(app)
    response = client.get("/static/index.html") # Assuming you have an index.html
    assert response.status_code == 200

def test_default_config():
    assert "theme" in DEFAULT_CONFIG
    assert DEFAULT_CONFIG["default_language"] == "en"
```

## Understanding and Using `DEFAULT_CONFIG`

* **LitePolis Configuration System:** When your module is deployed, these default values are automatically registered with the LitePolis configuration system.
* **Overriding Defaults:** If administrators provide custom configurations during deployment, those settings will override the default values defined in `DEFAULT_CONFIG`.

## Best Practice: Accessing Configuration in Your Code

To ensure your automated tests (using Pytest) can run without relying on a live LitePolis configuration service, it's recommended to use the following pattern for fetching configuration values:

```python
import os

# Define default values suitable for the testing environment
DEFAULT_TEST_CONFIG = {
    "ui_refresh_interval": 60,
    "show_notifications": True
    # Add other necessary default test config values here
}

# Configuration Fetching Logic
refresh_interval = None
show_notifications = None

# Check if running under Pytest
if "PYTEST_CURRENT_TEST" not in os.environ and "PYTEST_VERSION" not in os.environ:
    # NOT running under Pytest: Fetch from live source (replace with actual logic)
    print("Fetching configuration from live LitePolis...")
    refresh_interval = get_config("litepolis_ui_my_awesome_ui", "ui_refresh_interval")
    show_notifications = get_config("litepolis_ui_my_awesome_ui", "show_notifications")
else:
    # Running under Pytest: Use default test values
    print("Running under Pytest. Using default test configuration.")
    refresh_interval = DEFAULT_TEST_CONFIG["ui_refresh_interval"]
    show_notifications = DEFAULT_TEST_CONFIG["show_notifications"]

# Use the determined configuration values
print(f"UI Refresh Interval: {refresh_interval}")
print(f"Show Notifications: {show_notifications}")
```

This pattern allows your tests to use a predefined set of default configurations, making them independent and reliable. When your module runs within the LitePolis environment, it will fetch the live configuration.

## Integrating a React.js Frontend

If you are developing your UI using React.js, you will need to convert your React application into static files that can be served by the LitePolis UI module. Here's a general approach:

**1. Build Your React Application for Production:**

   You'll need to create an optimized production build of your React application. The exact command will depend on how your React project is set up:

   * **Using Create React App:** If you used Create React App, run the following command in your React project's root directory:

       ```bash
       npm run build
       # or
       yarn build
       ```

   * **Using a Custom Webpack/Babel Setup:** If you have a custom build process using Webpack and Babel (as described in [https://siddharthac6.medium.com/getting-started-with-react-js-using-webpack-and-babel-66549f8fbcb8](https://siddharthac6.medium.com/getting-started-with-react-js-using-webpack-and-babel-66549f8fbcb8)), you will need to configure your Webpack configuration to output the production-ready static files to a designated directory.

**2. Copy Static Assets to the LitePolis UI Module:**

   Once you have the production build of your React application (usually in a `build` directory), you need to copy the contents of this directory into the `static` directory of your LitePolis UI module template.

   Your LitePolis UI module's directory structure should look something like this after copying:

   ```
   litepolis-ui-my-awesome-ui/
   ├── litepolis_ui_my_awesome_ui/
   │   ├── core.py
   │   └── static/
   │       ├── index.html
   │       ├── static/        # (For CSS, JS, etc., often with hashed filenames)
   │       │   ├── css/
   │       │   └── js/
   │       └── ... (other static assets)
   ├── tests/
   │   └── test_core.py
   └── pyproject.toml
   ```

**3. Configure FastAPI to Serve Your Static Files:**

   Ensure that the `directory` path in the `StaticFiles` configuration within your `litepolis_ui_template/core.py` file correctly points to the `static` directory where you have placed your React application's build output. The example provided earlier in this README already demonstrates this:

   ```python
   from fastapi import FastAPI
   from fastapi.staticfiles import StaticFiles

   # ...

   app = FastAPI()
   app.mount("/static", StaticFiles(directory="static"), name="static")
   ```

By following these steps, you can integrate a React.js frontend into your LitePolis UI module, leveraging the power of React for building dynamic user interfaces within the LitePolis platform.
