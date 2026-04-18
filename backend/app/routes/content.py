"""Sections + content items (links, files, slides)."""

from flask import Blueprint, request, jsonify
from ..db import query_all, execute
from ..middleware import auth_required, role_required

content_bp = Blueprint('content', __name__)


# -----------------------------------------------------------------------------
# SECTIONS
# -----------------------------------------------------------------------------
@content_bp.route('/courses/<course_id>/sections', methods=['GET'])
def list_sections(course_id):
    rows = query_all(
        "SELECT section_id, course_id, title, display_order FROM sections "
        "WHERE course_id = %s ORDER BY display_order, section_id",
        (course_id,)
    )
    return jsonify(rows), 200


@content_bp.route('/courses/<course_id>/sections', methods=['POST'])
@auth_required
@role_required('lecturer', 'admin')
def create_section(course_id):
    data = request.get_json() or {}
    if not data.get('title'):
        return jsonify({'error': 'title required'}), 400
    row = execute(
        "INSERT INTO sections (course_id, title, display_order) VALUES (%s, %s, %s) RETURNING section_id",
        (course_id, data['title'], data.get('display_order', 0)),
        returning=True
    )
    return jsonify({'message': 'Section created', 'section_id': row['section_id']}), 201


# -----------------------------------------------------------------------------
# CONTENT ITEMS
# -----------------------------------------------------------------------------
@content_bp.route('/sections/<int:section_id>/content', methods=['POST'])
@auth_required
@role_required('lecturer', 'admin')
def add_content(section_id):
    data = request.get_json() or {}
    if not data.get('content_type') or not data.get('content'):
        return jsonify({'error': 'content_type and content required'}), 400
    if data['content_type'] not in ('link', 'file', 'slide'):
        return jsonify({'error': "content_type must be 'link', 'file', or 'slide'"}), 400

    row = execute(
        """
        INSERT INTO content_items (section_id, content_type, title, content)
        VALUES (%s, %s, %s, %s) RETURNING content_id
        """,
        (section_id, data['content_type'], data.get('title'), data['content']),
        returning=True
    )
    return jsonify({'message': 'Content added', 'content_id': row['content_id']}), 201


# -----------------------------------------------------------------------------
# GET /courses/<course_id>/content
# Returns all content for a course, grouped by section.
# -----------------------------------------------------------------------------
@content_bp.route('/courses/<course_id>/content', methods=['GET'])
def course_content(course_id):
    rows = query_all(
        """
        SELECT s.section_id, s.title AS section_title, s.display_order,
               ci.content_id, ci.content_type, ci.title AS item_title, ci.content
        FROM sections s
        LEFT JOIN content_items ci ON s.section_id = ci.section_id
        WHERE s.course_id = %s
        ORDER BY s.display_order, s.section_id, ci.content_id
        """,
        (course_id,)
    )
    # Group by section
    grouped = {}
    for r in rows:
        sid = r['section_id']
        if sid not in grouped:
            grouped[sid] = {
                'section_id':    sid,
                'section_title': r['section_title'],
                'display_order': r['display_order'],
                'items':         []
            }
        if r['content_id'] is not None:
            grouped[sid]['items'].append({
                'content_id':   r['content_id'],
                'content_type': r['content_type'],
                'title':        r['item_title'],
                'content':      r['content']
            })
    return jsonify(list(grouped.values())), 200
