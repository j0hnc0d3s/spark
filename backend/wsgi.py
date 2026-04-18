"""Production WSGI entry. Used by gunicorn on Railway/Render/etc."""

from app import create_app

app = create_app()
