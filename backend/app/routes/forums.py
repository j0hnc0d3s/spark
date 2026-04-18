"""Forums, threads, and posts (nested reddit-style replies)."""

from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute
from ..middleware import auth_required

forums_bp = Blueprint('forums', __name__)


# -----------------------------------------------------------------------------
# FORUMS
# -----------------------------------------------------------------------------
@forums_bp.route('/courses/<course_id>/forums', methods=['GET'])
def list_forums(course_id):
    rows = query_all(
        "SELECT forum_id, course_id, title, created_at FROM forums WHERE course_id = %s ORDER BY forum_id",
        (course_id,)
    )
    return jsonify(rows), 200


@forums_bp.route('/courses/<course_id>/forums', methods=['POST'])
@auth_required
def create_forum(course_id):
    data = request.get_json() or {}
    if not data.get('title'):
        return jsonify({'error': 'title required'}), 400

    row = execute(
        "INSERT INTO forums (course_id, title) VALUES (%s, %s) RETURNING forum_id",
        (course_id, data['title']),
        returning=True
    )
    return jsonify({'message': 'Forum created', 'forum_id': row['forum_id']}), 201


# -----------------------------------------------------------------------------
# THREADS
# -----------------------------------------------------------------------------
@forums_bp.route('/forums/<int:forum_id>/threads', methods=['GET'])
def list_threads(forum_id):
    rows = query_all(
        """
        SELECT t.thread_id, t.forum_id, t.title, t.created_by, t.created_at,
               u.first_name || ' ' || u.last_name AS creator_name
        FROM threads t
        JOIN users u ON t.created_by = u.user_id
        WHERE t.forum_id = %s
        ORDER BY t.thread_id DESC
        """,
        (forum_id,)
    )
    return jsonify(rows), 200


@forums_bp.route('/forums/<int:forum_id>/threads', methods=['POST'])
@auth_required
def create_thread(forum_id):
    """Create a thread. Body: {title, content} where content is the opening post."""
    data = request.get_json() or {}
    if not data.get('title') or not data.get('content'):
        return jsonify({'error': 'title and content required'}), 400

    user_id = g.current_user['user_id']

    # Create thread, then the opening post in a single connection
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO threads (forum_id, created_by, title) VALUES (%s, %s, %s) RETURNING thread_id",
                (forum_id, user_id, data['title'])
            )
            thread_id = cur.fetchone()[0]
            cur.execute(
                """
                INSERT INTO posts (thread_id, created_by, content, parent_post_id)
                VALUES (%s, %s, %s, NULL) RETURNING post_id
                """,
                (thread_id, user_id, data['content'])
            )
            post_id = cur.fetchone()[0]
            conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Create failed', 'detail': str(e)}), 400
    finally:
        conn.close()

    return jsonify({
        'message':   'Thread created',
        'thread_id': thread_id,
        'post_id':   post_id
    }), 201


# -----------------------------------------------------------------------------
# POSTS  (nested replies: parent_post_id refs another post in the same thread)
# -----------------------------------------------------------------------------
@forums_bp.route('/threads/<int:thread_id>/posts', methods=['GET'])
def list_posts(thread_id):
    """Return all posts in the thread. Client can nest by parent_post_id client-side."""
    rows = query_all(
        """
        SELECT p.post_id, p.thread_id, p.created_by, p.content,
               p.parent_post_id, p.created_at,
               u.first_name || ' ' || u.last_name AS author_name
        FROM posts p
        JOIN users u ON p.created_by = u.user_id
        WHERE p.thread_id = %s
        ORDER BY p.post_id
        """,
        (thread_id,)
    )
    return jsonify(rows), 200


@forums_bp.route('/threads/<int:thread_id>/posts', methods=['POST'])
@auth_required
def create_post(thread_id):
    """Reply to a thread (top-level if no parent_post_id) or to another post."""
    data = request.get_json() or {}
    if not data.get('content'):
        return jsonify({'error': 'content required'}), 400

    parent_id = data.get('parent_post_id')  # may be None

    # If parent given, ensure it belongs to the same thread
    if parent_id is not None:
        parent = query_one("SELECT thread_id FROM posts WHERE post_id = %s", (parent_id,))
        if not parent:
            return jsonify({'error': 'parent_post_id not found'}), 404
        if parent['thread_id'] != thread_id:
            return jsonify({'error': 'parent_post is in a different thread'}), 400

    row = execute(
        """
        INSERT INTO posts (thread_id, created_by, content, parent_post_id)
        VALUES (%s, %s, %s, %s) RETURNING post_id
        """,
        (thread_id, g.current_user['user_id'], data['content'], parent_id),
        returning=True
    )
    return jsonify({'message': 'Post created', 'post_id': row['post_id']}), 201
