"""
Vercel Serverless Function entry point for Wharton WInS Dashboard.
Exports top-level ASGI `app` and Lambda `handler` with crash shield.
"""

import sys
import os
import tempfile

_tmp = tempfile.gettempdir()
os.environ.setdefault("YFINANCE_CACHE_DIR", os.path.join(_tmp, "py-yfinance"))
os.environ.setdefault("WINS_DB_PATH", os.path.join(_tmp, "wins_data.db"))

_dir = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.join(_dir, "_backend")
if _backend not in sys.path:
    sys.path.insert(0, _backend)
if _dir not in sys.path:
    sys.path.insert(0, _dir)

try:
    from _backend.main import app as _starlette_app
    from mangum import Mangum
    _asgi_handler = Mangum(_starlette_app, lifespan="off")
except Exception:
    import traceback
    _tb = traceback.format_exc()
    from starlette.applications import Starlette
    from starlette.responses import JSONResponse
    from starlette.routing import Route
    from mangum import Mangum

    async def _fallback(request):
        return JSONResponse({"error": "Backend initialization failed", "traceback": _tb}, status_code=200)

    _starlette_app = Starlette(routes=[
        Route("/{path:path}", _fallback),
        Route("/", _fallback)
    ])
    _asgi_handler = Mangum(_starlette_app, lifespan="off")

app = _starlette_app
handler = _asgi_handler
