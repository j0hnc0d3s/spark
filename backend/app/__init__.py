"""Flask application factory for Spark."""

import os

from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .routes.auth        import auth_bp
from .routes.courses     import courses_bp
from .routes.events      import events_bp
from .routes.forums      import forums_bp
from .routes.content     import content_bp
from .routes.assignments import assignments_bp
from .routes.reports     import reports_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Open CORS for frontend dev; tighten for production.

    CORS(app,
        origins=os.getenv('ALLOWED_ORIGINS', '').split(','),
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        supports_credentials=True,
    )

    # Register feature blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(forums_bp)
    app.register_blueprint(content_bp)
    app.register_blueprint(assignments_bp)
    app.register_blueprint(reports_bp)

    @app.route('/')
    def index():
        return jsonify({
            'service': 'Spark API',
            'status':  'ok',
            'version': '1.0'
        })

    @app.route('/health')
    def health():
        return jsonify({'status': 'ok'}), 200

    return app
