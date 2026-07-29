from flask import Flask
from flask_cors import CORS

from .core.config import config
from .core.errors import register_error_handlers
from .api import register_blueprints


def create_app() -> Flask:
    app = Flask(__name__)

    origins = list(config.FRONTEND_ORIGINS) + list(config.FRONTEND_ORIGIN_PATTERNS)
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)

    register_blueprints(app)
    register_error_handlers(app)
    return app
