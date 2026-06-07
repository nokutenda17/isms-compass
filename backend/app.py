"""
ISMS Compass — Flask Application Factory
Run: python app.py
     python app.py --seed   (seed demo data)
"""
import os
import sys
import logging

from flask import Flask, jsonify
from flask_cors import CORS

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s'
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    from models import init_db
    from routes.auth import auth_bp
    from routes.organisations import orgs_bp
    from routes.dashboard import dashboard_bp
    from routes.steps import steps_bp
    from routes.risks import risks_bp
    from routes.soa import soa_bp
    from routes.documents import documents_bp
    from routes.monitoring import monitoring_bp
    from routes.register import register_bp
    from routes.users_and_more import (
        users_bp, audit_log_bp, notifications_bp, ai_bp
    )

    app = Flask(__name__)

    # ── Config ────────────────────────────────────────────────────────────────
    app.config['SECRET_KEY'] = os.environ.get(
        'JWT_SECRET_KEY', 'isms-compass-dev-secret-change-in-production'
    )
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB upload limit

    # ── Database init inside app context ──────────────────────────────────────
    with app.app_context():
        init_db()

    # ── CORS ──────────────────────────────────────────────────────────────────
    allowed_origins = os.environ.get(
        'CORS_ORIGINS',
        'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173'
    ).split(',')
    CORS(app, origins=allowed_origins, supports_credentials=True)

    # ── Blueprints ────────────────────────────────────────────────────────────
    for bp in [
        auth_bp, orgs_bp, dashboard_bp, steps_bp, risks_bp,
        soa_bp, documents_bp,
        register_bp,
        users_bp, audit_log_bp, notifications_bp, ai_bp,
    ]:
        app.register_blueprint(bp, url_prefix='/api')

    # Monitoring gets its own sub-prefix so frontend /monitoring/* routes resolve
    app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')

    # ── Health check ──────────────────────────────────────────────────────────
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'app': 'ISMS Compass', 'version': '1.0.0'}), 200

    # ── Global error handlers ─────────────────────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': 'Bad request', 'detail': str(e)}), 400

    @app.errorhandler(401)
    def unauthorised(e):
        return jsonify({'error': 'Unauthorised'}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'error': 'Forbidden — insufficient permissions'}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def server_error(e):
        logger.exception("Unhandled server error")
        return jsonify({'error': 'Internal server error'}), 500

    return app


if __name__ == '__main__':
    app = create_app()

    if '--seed' in sys.argv or os.environ.get('SEED_DB') == '1':
        from seed import seed
        seed()

    port  = int(os.environ.get('PORT', 5000))
    # Default debug to OFF — must be explicitly enabled
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'

    logger.info("ISMS Compass API starting on http://localhost:%d (debug=%s)", port, debug)
    app.run(host='0.0.0.0', port=port, debug=debug)
