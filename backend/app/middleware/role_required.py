"""Role gate decorator. Use AFTER @auth_required.

    @auth_required
    @role_required('admin')
    def some_route(...): ...
"""

from functools import wraps
from flask import jsonify, g


def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                return jsonify({'error': 'Not authenticated'}), 401
            if user.get('role') not in allowed_roles:
                return jsonify({
                    'error': 'Forbidden',
                    'required_roles': list(allowed_roles),
                    'your_role': user.get('role')
                }), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator
