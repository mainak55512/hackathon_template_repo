import os
from datetime import timedelta


class Config:
    SQLALCHEMY_DATABASE_URI = "sqlite:///hackathon.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "dev - secret - key - CHANGE - IN - PRODUCTION"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
