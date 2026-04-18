"""
Raw psycopg2 helpers. No ORM, per COMP3161 spec.
Returns rows as dicts (RealDictCursor) so Flask jsonify() works cleanly.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from .config import Config


def get_connection():
    """Open a new Postgres connection."""
    return psycopg2.connect(Config.dsn())


def query_all(sql, params=None):
    """Execute SELECT and return all rows as list of dicts."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        conn.close()


def query_one(sql, params=None):
    """Execute SELECT and return first row as dict (or None)."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            return cur.fetchone()
    finally:
        conn.close()


def execute(sql, params=None, returning=False):
    """
    Execute INSERT/UPDATE/DELETE. If returning=True, returns the first row
    of RETURNING output. Otherwise returns rowcount.
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            result = cur.fetchone() if returning else cur.rowcount
            conn.commit()
            return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
