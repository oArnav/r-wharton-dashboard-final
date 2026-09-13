"""
Vercel Serverless Function entry point for Wharton WInS Dashboard.
Exposes Starlette ASGI app from backend/main.py with Mangum Lambda compatibility.
"""

import sys
import os
import logging

logger = logging.getLogger("wins_serverless")

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

# 1. Check api/_backend (bundled directly with function)
api_backend = os.path.join(current_dir, "_backend")
# 2. Check root/backend (via includeFiles or local dev)
root_backend = os.path.join(parent_dir, "backend")
# 3. Check cwd backend
cwd_backend = os.path.join(os.getcwd(), "backend")

for candidate in [api_backend, root_backend, cwd_backend]:
    if os.path.isdir(candidate) and candidate not in sys.path:
        sys.path.insert(0, candidate)

try:
    from main import app
except Exception as err:
    logger.error(f"Failed to import Starlette app: {err}")
    raise

# Support both Vercel native ASGI and AWS Lambda handler modes
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except Exception:
    handler = app

