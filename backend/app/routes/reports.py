"""Reports: endpoints that read from the five required views."""

from flask import Blueprint, jsonify
from ..db import query_all

reports_bp = Blueprint('reports', __name__)


# -----------------------------------------------------------------------------
# 1. Courses with 50+ students
# -----------------------------------------------------------------------------
@reports_bp.route('/reports/courses/50-plus-students', methods=['GET'])
def courses_50_plus():
    return jsonify(query_all("SELECT * FROM v_courses_50_plus_students")), 200


# -----------------------------------------------------------------------------
# 2. Students in 5+ courses
# -----------------------------------------------------------------------------
@reports_bp.route('/reports/students/5-plus-courses', methods=['GET'])
def students_5_plus():
    return jsonify(query_all("SELECT * FROM v_students_5_plus_courses")), 200


# -----------------------------------------------------------------------------
# 3. Lecturers teaching 3+ courses
# -----------------------------------------------------------------------------
@reports_bp.route('/reports/lecturers/3-plus-courses', methods=['GET'])
def lecturers_3_plus():
    return jsonify(query_all("SELECT * FROM v_lecturers_3_plus_courses")), 200


# -----------------------------------------------------------------------------
# 4. Top 10 most enrolled courses
# -----------------------------------------------------------------------------
@reports_bp.route('/reports/courses/top-10-enrolled', methods=['GET'])
def top_10_enrolled():
    return jsonify(query_all("SELECT * FROM v_top_10_enrolled_courses")), 200


# -----------------------------------------------------------------------------
# 5. Top 10 students by overall average
# -----------------------------------------------------------------------------
@reports_bp.route('/reports/students/top-10-averages', methods=['GET'])
def top_10_students():
    rows = query_all("SELECT * FROM v_top_10_students_by_average")
    # Convert Decimal to float for clean JSON
    for r in rows:
        if r.get('overall_average') is not None:
            r['overall_average'] = float(r['overall_average'])
    return jsonify(rows), 200
