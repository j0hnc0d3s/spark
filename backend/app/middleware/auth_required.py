"""JWT authentication decorator.
Reads 'Authorization: Bearer <token>' and attaches the decoded
payload to flask.g.current_user.
"""

from functools import wraps
import jwt
from flask import request, jsonify, g

from ..config import Config


def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return jsonify({'error': 'Missing or malformed Authorization header'}), 401

        token = header.split(' ', 1)[1].strip()
        try:
            payload = jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGO])
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        g.current_user = payload   # {'user_id': ..., 'role': ...}
        return f(*args, **kwargs)
    return wrapper
