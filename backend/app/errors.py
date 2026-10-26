"""errors.py - Error envelope formatting conforming to 02_API_CONTRACT.md.

Every non-2xx response must match:
{
  "error": {
    "code": "CODE_STRING",
    "message": "Human readable message",
    "details": null | object
  }
}
Never expose stack traces, secrets, or file paths in the envelope.
"""
from typing import Optional, Any, Dict
from flask import jsonify, Response

class ApiError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details

    def to_response(self) -> Response:
        payload = {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details
            }
        }
        response = jsonify(payload)
        response.status_code = self.status_code
        return response


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(err: ApiError):
        return err.to_response()

    @app.errorhandler(400)
    def handle_400(e):
        return ApiError("INVALID_JSON", "Request body is not valid JSON or request is malformed.", 400).to_response()

    @app.errorhandler(404)
    def handle_404(e):
        return ApiError("NOT_FOUND", "The requested route or resource was not found.", 404).to_response()

    @app.errorhandler(405)
    def handle_405(e):
        return ApiError("METHOD_NOT_ALLOWED", "Method not allowed for this route.", 405).to_response()

    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        app.logger.error(f"Unhandled exception: {e}", exc_info=True)
        return ApiError("INTERNAL_ERROR", "An unexpected internal server error occurred.", 500).to_response()
