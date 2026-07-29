from flask import Flask
from flask_cors import CORS

from .config import config
from .errors import register_error_handlers


def create_app() -> Flask:
    app = Flask(__name__)

    origins = list(config.FRONTEND_ORIGINS) + list(config.FRONTEND_ORIGIN_PATTERNS)
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)

    from .blueprints.health import health_bp
    from .blueprints.shopify import shopify_bp
    from .blueprints.images import images_bp
    from .blueprints.subscriptions import subscriptions_bp
    from .blueprints.products import products_bp
    from .blueprints.orders import orders_bp
    from .blueprints.applications import applications_bp
    from .blueprints.china_delivery import china_delivery_bp
    from .blueprints.blasts import blasts_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(shopify_bp, url_prefix="/api/shopify")
    app.register_blueprint(images_bp, url_prefix="/api/images")
    app.register_blueprint(subscriptions_bp, url_prefix="/api/subscriptions")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(applications_bp, url_prefix="/api")
    app.register_blueprint(china_delivery_bp, url_prefix="/api")
    app.register_blueprint(blasts_bp, url_prefix="/api/blasts")

    register_error_handlers(app)
    return app
