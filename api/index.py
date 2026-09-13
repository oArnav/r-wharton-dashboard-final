"""
Vercel Serverless Function entry point for Wharton WInS Dashboard.
Exposes Starlette ASGI app from backend/main.py.
"""

import sys
import os

# Ensure backend directory is in Python module search path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(parent_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
