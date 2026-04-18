"""Calendar events blueprint."""

from flask import Blueprint, request, jsonify, g
from ..db import query_all, execute
from ..middleware import auth_required, role_required

events_bp = Blueprint('events', __name__)


# -----------------------------------------------------------------------------
# POST /courses/<course_id>/events  (lecturer/admin creates)
# -----------------------------------------------------------------------------
@events_bp.route('/courses/<course_id>/events', methods=['POST'])
@auth_required
@role_required('lecturer', 'admin')
def create_event(course_id):
    data = request.get_json() or {}
    if not data.get('title') or not data.get('event_date'):
        return jsonify({'error': 'title and event_date required (YYYY-MM-DD)'}), 400

    row = execute(
        """
        INSERT INTO calendar_events (course_id, created_by, title, event_date, description)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING event_id
        """,
        (course_id, g.current_user['user_id'],
         data['title'], data['event_date'], data.get('description')),
        returning=True
    )
    return jsonify({'message': 'Event created', 'event_id': row['event_id']}), 201


# -----------------------------------------------------------------------------
# GET /courses/<course_id>/events  (all events for a course)
# -----------------------------------------------------------------------------
@events_bp.route('/courses/<course_id>/events', methods=['GET'])
def course_events(course_id):
    rows = query_all(
        """
        SELECT event_id, course_id, created_by, title, event_date, description
        FROM calendar_events
        WHERE course_id = %s
        ORDER BY event_date, event_id
        """,
        (course_id,)
    )
    return jsonify(rows), 200


# -----------------------------------------------------------------------------
# GET /students/<user_id>/events?date=YYYY-MM-DD
# (all events on a given date for courses the student is enrolled in)
# -----------------------------------------------------------------------------
@events_bp.route('/students/<user_id>/events', methods=['GET'])
def student_events_on_date(user_id):
    target_date = request.args.get('date')
    if not target_date:
        return jsonify({'error': 'date query param required (YYYY-MM-DD)'}), 400

    rows = query_all(
        """
        SELECT e.event_id, e.course_id, c.title AS course_title,
               e.title, e.event_date, e.description
        FROM calendar_events e
        JOIN registrations r ON e.course_id = r.course_id
        JOIN courses c       ON e.course_id = c.course_id
        WHERE r.user_id = %s AND e.event_date = %s
        ORDER BY e.event_id
        """,
        (user_id, target_date)
    )
    return jsonify(rows), 200
