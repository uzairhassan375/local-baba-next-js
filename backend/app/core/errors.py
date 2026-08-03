from flask import jsonify


def register_error_handlers(app):
    @app.errorhandler(404)
    def not_found(_err):
        return jsonify(success=False, error="Not found"), 404

    @app.errorhandler(405)
    def method_not_allowed(_err):
        return jsonify(success=False, error="Method not allowed"), 405

    @app.errorhandler(500)
    def server_error(err):
        app.logger.exception(err)
        return jsonify(success=False, error="Internal server error"), 500

    # In debug mode Flask hands unhandled exceptions to Werkzeug's
    # interactive debugger instead of the 500 handler above, which renders
    # an HTML traceback page outside the normal response pipeline — so
    # flask-cors never gets a chance to attach CORS headers to it, and the
    # browser blocks it as a generic "Failed to fetch" instead of showing
    # the real error. Registering a catch-all Exception handler makes Flask
    # use it (with CORS applied) for any exception, not just explicit
    # abort(500) calls, while the traceback still prints server-side via
    # app.logger.exception above.
    @app.errorhandler(Exception)
    def unhandled_exception(err):
        app.logger.exception(err)
        return jsonify(success=False, error="Internal server error"), 500
