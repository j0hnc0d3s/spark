"""Courses blueprint: CRUD, registration, lecturer assignment, members."""

from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute
from ..middleware import auth_required, role_required

courses_bp = Blueprint('courses', __name__)


# -----------------------------------------------------------------------------
# POST /courses  (admin only)
# -----------------------------------------------------------------------------
@courses_bp.route('/courses', methods=['POST'])
@auth_required
@role_required('admin')
def create_course():
    data = request.get_json() or {}
    if not data.get('course_id') or not data.get('title'):
        return jsonify({'error': 'course_id and title required'}), 400

    try:
        execute(
            "INSERT INTO courses (course_id, title, lecturer_id) VALUES (%s, %s, %s)",
            (data['course_id'], data['title'], data.get('lecturer_id'))
        )
    except Exception as e:
        return jsonify({'error': 'Create failed', 'detail': str(e)}), 400

    return jsonify({'message': 'Course created', 'course_id': data['course_id']}), 201


# -----------------------------------------------------------------------------
# GET /courses
# -----------------------------------------------------------------------------
@courses_bp.route('/courses', methods=['GET'])
def list_courses():
    rows = query_all(
        """
        SELECT c.course_id, c.title, c.lecturer_id,
               u.first_name || ' ' || u.last_name AS lecturer_name
        FROM courses c
        LEFT JOIN users u ON c.lecturer_id = u.user_id
        ORDER BY c.course_id
        """
    )
    return jsonify(rows), 200


# -----------------------------------------------------------------------------
# GET /students/<user_id>/courses
# -----------------------------------------------------------------------------
@courses_bp.route('/students/<user_id>/courses', methods=['GET'])
def student_courses(user_id):
    rows = query_all(
        """
        SELECT c.course_id, c.title, c.lecturer_id
        FROM registrations r
        JOIN courses c ON r.course_id = c.course_id
        WHERE r.user_id = %s
        ORDER BY c.course_id
        """,
        (user_id,)
    )
    return jsonify(rows), 200


# -----------------------------------------------------------------------------
# GET /lecturers/<user_id>/courses
# -----------------------------------------------------------------------------
@courses_bp.route('/lecturers/<user_id>/courses', methods=['GET'])
def lecturer_courses(user_id):
    rows = query_all(
        "SELECT course_id, title FROM courses WHERE lecturer_id = %s ORDER BY course_id",
        (user_id,)
    )
    return jsonify(rows), 200


# -----------------------------------------------------------------------------
# POST /courses/<course_id>/assign-lecturer  (admin only; one lecturer per course)
# -----------------------------------------------------------------------------
@courses_bp.route('/courses/<course_id>/assign-lecturer', methods=['POST'])
@auth_required
@role_required('admin')
def assign_lecturer(course_id):
    data = request.get_json() or {}
    lecturer_id = data.get('lecturer_id')
    if not lecturer_id:
        return jsonify({'error': 'lecturer_id required'}), 400

    # Validate the user exists and has role=lecturer
    lect = query_one(
        "SELECT user_id, role FROM users WHERE user_id = %s",
        (lecturer_id,)
    )
    if not lect:
        return jsonify({'error': 'Lecturer not found'}), 404
    if lect['role'] != 'lecturer':
        return jsonify({'error': 'User is not a lecturer'}), 400

    rc = execute(
        "UPDATE courses SET lecturer_id = %s WHERE course_id = %s",
        (lecturer_id, course_id)
    )
    if rc == 0:
        return jsonify({'error': 'Course not found'}), 404
    return jsonify({'message': 'Lecturer assigned'}), 200


# -----------------------------------------------------------------------------
# POST /courses/<course_id>/register  (students enroll)
# -----------------------------------------------------------------------------
@courses_bp.route('/courses/<course_id>/register', methods=['POST'])
@auth_required
@role_required('student')
def register_for_course(course_id):
    user_id = g.current_user['user_id']

    # Check course exists
    course = query_one("SELECT course_id FROM courses WHERE course_id = %s", (course_id,))
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    try:
        execute(
            "INSERT INTO registrations (user_id, course_id) VALUES (%s, %s)",
            (user_id, course_id)
        )
    except Exception as e:
        return jsonify({'error': 'Registration failed', 'detail': str(e)}), 400

    return jsonify({
        'message':   'Registered for course',
        'user_id':   user_id,
        'course_id': course_id
    }), 201


# -----------------------------------------------------------------------------
# GET /courses/<course_id>/members
# -----------------------------------------------------------------------------
@courses_bp.route('/courses/<course_id>/members', methods=['GET'])
def course_members(course_id):
    # Lecturer + enrolled students
    lecturer = query_one(
        """
        SELECT u.user_id, u.username, u.first_name, u.last_name, u.role
        FROM courses c
        JOIN users u ON c.lecturer_id = u.user_id
        WHERE c.course_id = %s
        """,
        (course_id,)
    )
    students = query_all(
        """
        SELECT u.user_id, u.username, u.first_name, u.last_name, u.role
        FROM registrations r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.course_id = %s AND u.role = 'student'
        ORDER BY u.user_id
        """,
        (course_id,)
    )
    return jsonify({
        'course_id': course_id,
        'lecturer':  lecturer,
        'students':  students,
        'count':     len(students) + (1 if lecturer else 0)
    }), 200
