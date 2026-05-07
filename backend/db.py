from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class Role(db.Model):
    __tablename__ = "roles"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    users = db.relationship("User", backref="role", lazy=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role.name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
        }


class TokenBlocklist(db.Model):
    """Stores revoked JTIs so logout is immediate."""

    __tablename__ = "token_blocklist"
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class Log(db.Model):
    __tablename__ = "logs"

    id = db.Column(db.Integer, primary_key=True)
    input_data = db.Column(db.JSON, nullable=False, default=dict)
    # normalized_output = db.Column(db.JSON, nullable=False, default=dict)
    # generated_comments = db.Column(db.Text, nullable=False, default="")
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )

    user = db.relationship("User", back_populates="logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "input_data": self.input_data,
            # "normalized_output": self.normalized_output,
            # "generated_comments": self.generated_comments,
            "user_id": self.user_id,
        }


def init_db():
    for role_name in ["Admin", "Viewer"]:
        if not Role.query.filter_by(name=role_name).first():
            db.session.add(Role(name=role_name))
    db.session.commit()

    # default admin user
    if not User.query.filter_by(username="admin").first():
        admin_role = Role.query.filter_by(name="Admin").first()
        admin = User(username="admin", email="admin@example.com", role=admin_role)
        admin.set_password("admin123")
        db.session.add(admin)

    # default viewer user
    if not User.query.filter_by(username="viewer").first():
        viewer_role = Role.query.filter_by(name="Viewer").first()
        viewer = User(username="viewer", email="viewer@example.com", role=viewer_role)
        viewer.set_password("viewer123")
        db.session.add(viewer)

    db.session.commit()
    print("Database initialized with default users:")
