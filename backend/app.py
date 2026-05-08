from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
ADMIN_UI_DIR = BACKEND_DIR / "admin_portal"
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from db import db, init_db
from config import Config
from routes import api, jwt
from llm.rag.routes import rag_api


from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

app.config.from_object(Config)

app.register_blueprint(api, url_prefix="/api")
app.register_blueprint(rag_api, url_prefix="/api")

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100 per day", "30 per hour"],
    storage_uri="memory://",
)

db.init_app(app)
jwt.init_app(app)

CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route("/")
def root():
    return send_from_directory(ADMIN_UI_DIR, "index.html")


@app.route("/admin")
@app.route("/admin/")
def admin_panel():
    return send_from_directory(ADMIN_UI_DIR, "index.html")


@app.route("/admin/<path:filename>")
def admin_assets(filename: str):
    return send_from_directory(ADMIN_UI_DIR, filename)


@app.route("/favicon.ico")
def favicon():
    favicon_path = ADMIN_UI_DIR / "favicon.ico"
    if favicon_path.exists():
        return send_from_directory(ADMIN_UI_DIR, "favicon.ico")
    return ("", 204)


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        init_db()

    app.run(debug=True, port=5000)
