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
