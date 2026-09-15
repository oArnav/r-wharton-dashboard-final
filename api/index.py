"""
Vercel Serverless Function entry point for Wharton WInS Dashboard.
Exports top-level `app`, `application`, and `handler` for Vercel Python runtime.
"""

import sys
import os

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

import main as _main_module

# Top-level entrypoint assignments required by Vercel @vercel/python
app = _main_module.app
application = app
handler = app


