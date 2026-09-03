import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from backend.config import Config
from backend.database import init_db, DB_ENGINE_TYPE
from backend.models import utcnow_iso
from backend.routes.auth_routes import auth_bp
from backend.routes.citizen_routes import citizen_bp
from backend.routes.police_routes import police_bp
from backend.routes.consumer_routes import consumer_bp
from backend.routes.admin_routes import admin_bp
from backend.routes.case_message_routes import case_message_bp

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Database Schema & Seed Data
    init_db()

    # Health Check
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "OK",
            "platform": "SentinelX - AI-Assisted Public Safety & Consumer Protection Platform",
            "jurisdiction": "People's Republic of Bangladesh",
            "backend": "Flask (Python 3)",
            "databaseEngine": "PostgreSQL" if DB_ENGINE_TYPE == "POSTGRESQL" else "PostgreSQL (SQLite Local Mode)",
            "timestamp": utcnow_iso(),
        })

    # Register Route Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(citizen_bp)
    app.register_blueprint(police_bp)
    app.register_blueprint(consumer_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(case_message_bp)

    # API 404 handler
    @app.errorhandler(404)
    def api_not_found(e):
        if request.path.startswith("/api"):
            return jsonify({"error": f"API endpoint {request.path} not found."}), 404
        # If static build exists, serve index.html for SPA
        dist_dir = os.path.join(os.path.dirname(__file__), "dist")
        if os.path.exists(os.path.join(dist_dir, "index.html")):
            return send_from_directory(dist_dir, "index.html")
        return e

    # Production static file serving
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        dist_dir = os.path.join(os.path.dirname(__file__), "dist")
        target = os.path.join(dist_dir, path)
        if path != "" and os.path.exists(target) and not os.path.isdir(target):
            return send_from_directory(dist_dir, path)
        if os.path.exists(os.path.join(dist_dir, "index.html")):
            return send_from_directory(dist_dir, "index.html")
        return jsonify({
            "message": "SentinelX Flask Backend running on http://127.0.0.1:5000. Start Vite dev server for React UI.",
            "health": "/api/health"
        })

    return app

app = create_app()

if __name__ == "__main__":
    print(f"SentinelX Flask Backend starting on http://{Config.HOST}:{Config.PORT}")
    app.run(host=Config.HOST, port=Config.PORT, debug=False, use_reloader=False)
