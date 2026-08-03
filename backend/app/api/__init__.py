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
    from .favorites import favorites_bp
    from .cart import cart_bp
    from .notifications import notifications_bp
    from .invoice_settings import invoice_settings_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(shopify_bp, url_prefix="/api/shopify")
    app.register_blueprint(images_bp, url_prefix="/api/images")
    app.register_blueprint(subscriptions_bp, url_prefix="/api/subscriptions")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(applications_bp, url_prefix="/api")
    app.register_blueprint(china_delivery_bp, url_prefix="/api")
    app.register_blueprint(blasts_bp, url_prefix="/api/blasts")
    app.register_blueprint(favorites_bp, url_prefix="/api/favorites")
    app.register_blueprint(cart_bp, url_prefix="/api/cart")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(invoice_settings_bp, url_prefix="/api/invoice-settings")
