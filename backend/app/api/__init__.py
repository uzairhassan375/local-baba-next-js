from flask import Flask


def register_blueprints(app: Flask) -> None:
    from .health import health_bp
    from .shopify import shopify_bp
    from .images import images_bp
    from .subscriptions import subscriptions_bp
    from .products import products_bp
    from .orders import orders_bp
    from .applications import applications_bp
    from .china_delivery import china_delivery_bp
    from .blasts import blasts_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(shopify_bp, url_prefix="/api/shopify")
    app.register_blueprint(images_bp, url_prefix="/api/images")
    app.register_blueprint(subscriptions_bp, url_prefix="/api/subscriptions")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(applications_bp, url_prefix="/api")
    app.register_blueprint(china_delivery_bp, url_prefix="/api")
    app.register_blueprint(blasts_bp, url_prefix="/api/blasts")
