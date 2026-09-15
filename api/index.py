"""
Vercel Serverless Function entry point for Wharton WInS Dashboard.
Exports top-level ASGI `app` for Vercel Python runtime with crash protection.
"""

import sys
import os
import tempfile

# Force yfinance and sqlite to use writable /tmp directory on Vercel/Lambda
_tmp_dir = tempfile.gettempdir()
os.environ["YFINANCE_CACHE_DIR"] = os.path.join(_tmp_dir, "py-yfinance")
os.environ["WINS_DB_PATH"] = os.path.join(_tmp_dir, "wins_data.db")

_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dirs = [
    os.path.join(_current_dir, "_backend"),
    os.path.join(os.path.dirname(_current_dir), "backend"),
    os.path.join(os.getcwd(), "backend"),
    _current_dir,
]
for _b in _backend_dirs:
    if os.path.isdir(_b) and _b not in sys.path:
        sys.path.insert(0, _b)

try:
    import main as _main_module
    app = _main_module.app
except Exception:
    import traceback
    _tb = traceback.format_exc()
    from starlette.applications import Starlette
    from starlette.responses import PlainTextResponse
    from starlette.routing import Route

    async def _crash_shield(request):
        return PlainTextResponse(f"BACKEND INITIALIZATION ERROR:\n\n{_tb}", status_code=200)

    app = Starlette(routes=[
        Route("/api/health", _crash_shield),
        Route("/api", _crash_shield),
        Route("/{path:path}", _crash_shield),
    ])


