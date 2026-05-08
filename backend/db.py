import enum
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class LogLevel(enum.Enum):
    INFO = "Info"
    ERR = "Err"
    WARN = "Warn"


user_roles = db.Table(
    "user_roles",
    db.Column("user_id", db.Integer, db.ForeignKey("users.id")),
    db.Column("role_id", db.Integer, db.ForeignKey("role.id")),
)


class Role(db.Model):
    __tablename__ = "role"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    # users = db.relationship("User", backref="roles", secondary=user_roles, lazy=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    # role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    roles = db.relationship("Role", secondary=user_roles, backref="users")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "roles": [role.name for role in self.roles],
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
    message = db.Column(db.JSON, nullable=False, default=dict)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    log_level = db.Column(db.String, nullable=False, default=LogLevel.INFO)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship("User", backref="logs")

    # default_logger = User.query.filter_by(username="system").first().id

    def get_default_user():
        return User.query.filter_by(username="system").first().id

    @classmethod
    def info(cls, data, user_id=None):
        """Creates an INFO level log."""
        if user_id is None:
            user_id = cls.get_default_user()
        new_log = cls(user_id=user_id, message=data, log_level=LogLevel.INFO.value)
        db.session.add(new_log)
        db.session.commit()
        return new_log

    @classmethod
    def warn(cls, data, user_id=None):
        """Creates a WARN level log."""
        if user_id is None:
            user_id = cls.get_default_user()
        new_log = cls(user_id=user_id, message=data, log_level=LogLevel.WARN.value)
        db.session.add(new_log)
        db.session.commit()
        return new_log

    @classmethod
    def error(cls, data, user_id=None):
        """Creates an ERR level log."""
        if user_id is None:
            user_id = cls.get_default_user()
        new_log = cls(user_id=user_id, message=data, log_level=LogLevel.ERR.value)
        db.session.add(new_log)
        db.session.commit()
        return new_log

    @classmethod
    def all_logs(cls):
        # logs = cls.query.all()
        logs = cls.query.order_by(cls.created_at.desc()).all()
        return [log.to_dict() for log in logs]

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "message": self.message,
            "user": self.user.username,
            "log_level": self.log_level,
            "created_at": self.created_at,
        }


def init_db():
    Log.query.delete()
    for role_name in ["Admin", "Viewer", "System"]:
        if not Role.query.filter_by(name=role_name).first():
            db.session.add(Role(name=role_name))
    db.session.commit()

    # default admin user
    if not User.query.filter_by(username="admin").first():
        admin_role = Role.query.filter_by(name="Admin").first()
        admin = User(username="admin", email="admin@example.com", roles=[admin_role])
        admin.set_password("admin123")
        db.session.add(admin)

    # default viewer user
    if not User.query.filter_by(username="viewer").first():
        viewer_role = Role.query.filter_by(name="Viewer").first()
        viewer = User(
            username="viewer", email="viewer@example.com", roles=[viewer_role]
        )
        viewer.set_password("viewer123")
        db.session.add(viewer)

    if not User.query.filter_by(username="system").first():
        system_role = Role.query.filter_by(name="System").first()
        system = User(
            username="system", email="system@example.com", roles=[system_role]
        )
        system.set_password("system")
        db.session.add(system)

    db.session.commit()

    # admin = User.query.filter_by(username="admin").first()
    # viewer = User.query.filter_by(username="viewer").first()
    # system = User.query.filter_by(username="system").first()
    # if admin:
    #     print("Admin created:", admin.to_dict())
    # if viewer:
    #     print("Viewer created:", viewer.to_dict())
    # if system:
    #     print("System created:", system.to_dict())
    print("Database initialized with default users:")
    # Log.info("This is an Info Log")
    # Log.error("This is an Error Log")
    # Log.warn("This is a Warn Log")
    # print(Log.all_logs())
