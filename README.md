# LitePolis-ui-particiapp

ParticiApp frontend UI module for LitePolis. This module packages the [ParticiApp](https://partici.app/) frontend as a LitePolis UI module, providing a clean, modern interface for participating in Polis conversations using the ParticiAPI specification.

> Learn more about the amazing work by Code for NL: https://gitlab.com/particiapp/particiapi

## Overview

ParticiApp provides a simpler alternative to the Polis participation frontend:
- Clean, accessible UI design
- Works with ParticiAPI specification
- Static HTML/CSS/JS (no build step required)
- Supports voting, statement submission, and visualization

## Installation

```bash
litepolis-cli deploy add-deps litepolis-database-default
litepolis-cli deploy add-deps litepolis-database-particiapi
litepolis-cli deploy add-deps litepolis-router-particiapi
litepolis-cli deploy add-deps litepolis-ui-particiapp
litepolis-cli deploy sync-deps
```

## Configuration

This module exports default configuration that will be used automatically. To customize, create a config file:

```bash
litepolis-cli deploy init-config
```

Then edit `~/.litepolis/litepolis.config` to add:

```ini
[litepolis_ui_particiapp]
base_url = /particiapp
api_base_url = /api
```

Or set environment variables:
```bash
export LITEPOLIS_UI_PARTICIAPP_BASE_URL=/particiapp
```

## Quick Start

1. Install all ParticiAPI modules:
```bash
litepolis-cli deploy add-deps litepolis-router-particiapi
litepolis-cli deploy add-deps litepolis-database-particiapi
litepolis-cli deploy add-deps litepolis-ui-particiapp
litepolis-cli deploy sync-deps
```

2. Start LitePolis server:
```bash
litepolis-cli deploy serve
```

3. Access ParticiApp:
   - Main UI: `http://localhost:8000/particiapp/`
   - Conversation: `http://localhost:8000/particiapp/{conversation_id}`

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/particiapp/` | GET | Main ParticiApp UI |
| `/particiapp/privacy` | GET | Privacy policy page |
| `/particiapp/{conversation_id}` | GET | Conversation view |
| `/particiapp/scripts/*` | GET | JavaScript files |
| `/particiapp/style/*` | GET | CSS stylesheets |
| `/particiapp/images/*` | GET | Image assets |
| `/particiapp/fonts/*` | GET | Web fonts |

## ParticiAPI Compatibility

This UI module works with `LitePolis-router-particiapi`:

| ParticiAPI Endpoint | Method | Description |
|---------------------|--------|-------------|
| `/api/session` | POST | Create/refresh session |
| `/api/conversations/{id}` | GET | Get conversation |
| `/api/conversations/{id}/statements/` | GET/POST | Get/submit statements |
| `/api/conversations/{id}/votes/{tid}` | PUT | Submit vote |
| `/api/conversations/{id}/participant` | GET | Get participant info |
| `/api/conversations/{id}/results/` | GET | Get results |

## Testing

```bash
# Run unit tests
pytest tests/ -v

# E2E test with running server
python -c "
import requests
resp = requests.get('http://localhost:8000/particiapp/')
assert resp.status_code == 200
assert 'Agree' in resp.text
print('✓ ParticiApp UI test passed!')
"
```

## Project Structure

```
LitePolis-ui-particiapp/
├── pyproject.toml
├── README.md
├── litepolis_ui_particiapp/
│   ├── __init__.py          # Exports: router, DEFAULT_CONFIG, prefix, dependencies
│   ├── core.py              # FastAPI router
│   └── static/              # ParticiApp frontend
│       ├── index.html
│       ├── privacy.html
│       ├── scripts/
│       │   └── particiapi-client.js
│       ├── style/
│       ├── images/
│       └── fonts/
└── tests/
    └── test_core.py
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LitePolis + ParticiApp                    │
├─────────────────────────────────────────────────────────────┤
│  Browser → /particiapp/{conversation_id}                    │
│                    ↓                                        │
│  LitePolis-ui-particiapp (static HTML/CSS/JS)               │
│                    ↓ API calls                              │
│  LitePolis-router-particiapi (/api/* ParticiAPI)            │
│                    ↓                                        │
│  LitePolis-database-particiapi (SQLModel)                   │
└─────────────────────────────────────────────────────────────┘
```

## Comparison: ParticiApp vs Polis Frontend

| Feature | ParticiApp | Polis Frontend |
|---------|------------|----------------|
| Framework | Vanilla JS | Backbone.js/React |
| API | ParticiAPI | Polis API v3 |
| Complexity | Simple | Complex |
| Customization | Easy | Moderate |

## Related Projects

- [LitePolis](https://github.com/NewJerseyStyle/LitePolis) - Main project
- [LitePolis-router-particiapi](../LitePolis-router-particiapi) - ParticiAPI backend
- [LitePolis-database-particiapi](../LitePolis-database-particiapi) - Database layer
- [ParticiApp](https://partici.app/) - Official ParticiApp project

## License

MIT License
