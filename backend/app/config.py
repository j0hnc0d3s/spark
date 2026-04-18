"""Spark backend configuration. Loads from environment (via .env)."""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Database
    DB_HOST     = os.getenv('DB_HOST', 'localhost')
    DB_PORT     = int(os.getenv('DB_PORT', 5432))
    DB_NAME     = os.getenv('DB_NAME', 'spark')
    DB_USER     = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')

    # Auth
    JWT_SECRET  = os.getenv('JWT_SECRET', 'dev-only-change-me')
    JWT_ALGO    = 'HS256'
    JWT_TTL_HRS = int(os.getenv('JWT_TTL_HRS', 24))

    # Flask
    DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'
    PORT  = int(os.getenv('PORT', 5000))

    @classmethod
    def dsn(cls):
        """Return a psycopg2 connection string."""
        return (
            f"host={cls.DB_HOST} port={cls.DB_PORT} "
            f"dbname={cls.DB_NAME} user={cls.DB_USER} "
            f"password={cls.DB_PASSWORD}"
        )
