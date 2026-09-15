"""
Vercel Serverless Function entry point for Wharton WInS Dashboard.
Exports top-level ASGI `app` for Vercel Python runtime.
"""

import sys
import os
import tempfile

# Force temp directory for yfinance cache and sqlite on Vercel/Lambda serverless
_tmp = tempfile.gettempdir()
os.environ.setdefault("YFINANCE_CACHE_DIR", os.path.join(_tmp, "py-yfinance"))
os.environ.setdefault("WINS_DB_PATH", os.path.join(_tmp, "wins_data.db"))

_dir = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.join(_dir, "_backend")
if _backend not in sys.path:
    sys.path.insert(0, _backend)
if _dir not in sys.path:
    sys.path.insert(0, _dir)

# Import Starlette app from _backend
from _backend.main import app as _app

# Top-level ASGI entrypoint variable required by Vercel @vercel/python
app = _app
