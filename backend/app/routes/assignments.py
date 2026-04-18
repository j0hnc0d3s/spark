"""Assignments, submissions, grades."""

from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute
from ..middleware import auth_required, role_required

assignments_bp = Blueprint('assignments', __name__)


# -----------------------------------------------------------------------------
# ASSIGNMENTS
# -----------------------------------------------------------------------------
@assignments_bp.route('/courses/<course_id>/assignments', methods=['POST'])
@auth_required
@role_required('lecturer', 'admin')
def create_assignment(course_id):
    data = request.get_json() or {}
    if not data.get('title') or not data.get('due_date'):
        return jsonify({'error': 'title and due_date (YYYY-MM-DD) required'}), 400

    row = execute(
        """
        INSERT INTO assignments (course_id, title, description, due_date, max_score)
        VALUES (%s, %s, %s, %s, %s) RETURNING assignment_id
        """,
        (course_id, data['title'], data.get('description'),
         data['due_date'], data.get('max_score', 100)),
        returning=True
    )
    return jsonify({'message': 'Assignment created', 'assignment_id': row['assignment_id']}), 201


@assignments_bp.route('/courses/<course_id>/assignments', methods=['GET'])
def list_assignments(course_id):
    rows = query_all(
        """
        SELECT assignment_id, course_id, title, description, due_date, max_score
        FROM assignments
        WHERE course_id = %s
        ORDER BY due_date, assignment_id
        """,
        (course_id,)
    )
    return jsonify(rows), 200


# -----------------------------------------------------------------------------
# SUBMISSIONS
# -----------------------------------------------------------------------------
@assignments_bp.route('/assignments/<int:assignment_id>/submit', methods=['POST'])
@auth_required
@role_required('student')
def submit_assignment(assignment_id):
    """Student submits an assignment. Body: {file_path}."""
    data = request.get_json() or {}
    if not data.get('file_path'):
        return jsonify({'error': 'file_path required'}), 400

    student_id = g.current_user['user_id']
    try:
        row = execute(
            """
            INSERT INTO submissions (assignment_id, student_id, file_path)
            VALUES (%s, %s, %s) RETURNING submission_id
            """,
            (assignment_id, student_id, data['file_path']),
            returning=True
        )
    except Exception as e:
        return jsonify({'error': 'Submission failed', 'detail': str(e)}), 400

    return jsonify({
        'message':       'Submitted',
        'submission_id': row['submission_id']
    }), 201


@assignments_bp.route('/assignments/<int:assignment_id>/submissions', methods=['GET'])
@auth_required
@role_required('lecturer', 'admin')
def list_submissions(assignment_id):
    rows = query_all(
        """
        SELECT s.submission_id, s.student_id, s.file_path, s.submitted_at,
               u.first_name || ' ' || u.last_name AS student_name,
               g.score
        FROM submissions s
        JOIN users u  ON s.student_id = u.user_id
        LEFT JOIN grades g ON g.submission_id = s.submission_id
        WHERE s.assignment_id = %s
        ORDER BY s.submitted_at DESC
        """,
        (assignment_id,)
    )
    return jsonify(rows), 200


# -----------------------------------------------------------------------------
# GRADING
# -----------------------------------------------------------------------------
@assignments_bp.route('/submissions/<int:submission_id>/grade', methods=['POST'])
@auth_required
@role_required('lecturer', 'admin')
def grade_submission(submission_id):
    data = request.get_json() or {}
    if data.get('score') is None:
        return jsonify({'error': 'score required (0-100)'}), 400

    try:
        score = float(data['score'])
    except (TypeError, ValueError):
        return jsonify({'error': 'score must be a number'}), 400
    if not (0 <= score <= 100):
        return jsonify({'error': 'score must be between 0 and 100'}), 400

    # Check submission exists
    sub = query_one("SELECT submission_id FROM submissions WHERE submission_id = %s",
                    (submission_id,))
    if not sub:
        return jsonify({'error': 'Submission not found'}), 404

    # Upsert grade (one grade per submission; UNIQUE constraint on submission_id)
    existing = query_one("SELECT grade_id FROM grades WHERE submission_id = %s", (submission_id,))
    lecturer_id = g.current_user['user_id']

    if existing:
        execute(
            "UPDATE grades SET score = %s, lecturer_id = %s, graded_at = CURRENT_TIMESTAMP WHERE submission_id = %s",
            (score, lecturer_id, submission_id)
        )
        return jsonify({'message': 'Grade updated', 'score': score}), 200
    else:
        row = execute(
            "INSERT INTO grades (submission_id, lecturer_id, score) VALUES (%s, %s, %s) RETURNING grade_id",
            (submission_id, lecturer_id, score),
            returning=True
        )
        return jsonify({'message': 'Grade recorded',
                        'grade_id': row['grade_id'], 'score': score}), 201


# -----------------------------------------------------------------------------
# GET /students/<user_id>/average
# Final average = mean of all the student's grades across every course
# -----------------------------------------------------------------------------
@assignments_bp.route('/students/<user_id>/average', methods=['GET'])
def student_average(user_id):
    result = query_one(
        """
        SELECT ROUND(AVG(g.score)::numeric, 2) AS overall_average,
               COUNT(g.grade_id)               AS graded_count
        FROM submissions s
        JOIN grades g ON s.submission_id = g.submission_id
        WHERE s.student_id = %s
        """,
        (user_id,)
    )
    return jsonify({
        'user_id':         user_id,
        'overall_average': float(result['overall_average']) if result['overall_average'] is not None else None,
        'graded_count':    result['graded_count']
    }), 200
