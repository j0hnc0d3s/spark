"""Auth blueprint: /register, /login."""

from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from flask import Blueprint, request, jsonify

from ..config import Config
from ..db import query_one, execute

auth_bp = Blueprint('auth', __name__)


# -----------------------------------------------------------------------------
# POST /register
# -----------------------------------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register():
    """Create a new user account."""
    data = request.get_json() or {}
    required = ['user_id', 'username', 'email', 'password',
                'first_name', 'last_name', 'role']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing field: {field}'}), 400

    if data['role'] not in ('admin', 'lecturer', 'student'):
        return jsonify({'error': "role must be 'admin', 'lecturer', or 'student'"}), 400

    # Hash password with bcrypt
    pw_bytes = data['password'].encode('utf-8')
    pw_hash  = bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode('utf-8')

    try:
        execute(
            """
            INSERT INTO users
                (user_id, username, email, password_hash, first_name, last_name, role)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (data['user_id'], data['username'], data['email'],
             pw_hash, data['first_name'], data['last_name'], data['role'])
        )
    except Exception as e:
        return jsonify({'error': 'Registration failed', 'detail': str(e)}), 400

    return jsonify({
        'message': 'User registered',
        'user_id': data['user_id'],
        'role':    data['role']
    }), 201


# -----------------------------------------------------------------------------
# POST /login
# -----------------------------------------------------------------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate and return a JWT."""
    data = request.get_json() or {}
    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'username and password required'}), 400

    user = query_one(
        "SELECT user_id, username, password_hash, role FROM users WHERE username = %s",
        (data['username'],)
    )
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    try:
        ok = bcrypt.checkpw(data['password'].encode('utf-8'),
                            user['password_hash'].encode('utf-8'))
    except ValueError:
        # Seed data uses fake hashes; they fail bcrypt verification gracefully.
        ok = False

    if not ok:
        return jsonify({'error': 'Invalid credentials'}), 401

    exp = datetime.now(timezone.utc) + timedelta(hours=Config.JWT_TTL_HRS)
    token = jwt.encode(
        {'user_id': user['user_id'], 'role': user['role'], 'exp': exp},
        Config.JWT_SECRET, algorithm=Config.JWT_ALGO
    )

    return jsonify({
        'token':   token,
        'user_id': user['user_id'],
        'role':    user['role']
    }), 200
