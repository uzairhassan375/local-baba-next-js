from flask import Flask


def register_blueprints(app: Flask) -> None:
    from .health.routes import health_bp
    from .shopify.routes import shopify_bp
    from .images.routes import images_bp
    from .subscriptions.routes import subscriptions_bp
    from .products.routes import products_bp
    from .orders.routes import orders_bp
    from .applications.routes import applications_bp
    from .china_delivery.routes import china_delivery_bp
    from .blasts.routes import blasts_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(shopify_bp, url_prefix="/api/shopify")
    app.register_blueprint(images_bp, url_prefix="/api/images")
    app.register_blueprint(subscriptions_bp, url_prefix="/api/subscriptions")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(applications_bp, url_prefix="/api")
    app.register_blueprint(china_delivery_bp, url_prefix="/api")
    app.register_blueprint(blasts_bp, url_prefix="/api/blasts")
