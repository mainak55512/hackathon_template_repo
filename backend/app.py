from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sys
from pathlib import Path
from db import db, init_db
from config import Config
from routes import api, jwt

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

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


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        init_db()

    app.run(debug=True, port=5000)
