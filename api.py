from flask import Flask, request, jsonify
from db_connector import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from functools import wraps

app = Flask(__name__)
app.json.sort_keys = False
app.config['JWT_SECRET_KEY'] = 'secret_key'
jwt = JWTManager(app)

MEMBER = {"admin", "lecturer", "student"}

#admin required 
def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


#a. Register User /register [POST]
@app.route('/user/register', methods=['POST'])
def register_user():
    try:
        data = request.get_json()

        #Check required fields
        required_fields = ['password', 'role', 'first_name', 'last_name', 'gender']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400
            
        password = data['password']
        role = data['role']
        first_name = data['first_name']
        last_name = data['last_name']
        gender = data['gender']

        #Validate role
        if role not in MEMBER:
            return jsonify({"error": f"Invalid role"}), 400

        if role == "admin":
            return jsonify({"error": "Admin accounts cannot be registered"}), 403

        conn = get_db_connection()
        cursor = conn.cursor()

        if role == "student":
            cursor.execute("SELECT MAX(user_id) FROM Users WHERE role='student'")
            result = cursor.fetchone()[0]
            user_id = 26000000 if result is None else result + 1

        elif role == "lecturer":
            cursor.execute("SELECT MAX(user_id) FROM Users WHERE role='lecturer'")
            result = cursor.fetchone()[0]
            user_id = 2026000 if result is None else result + 1

        else:
            return jsonify({"error": "Invalid role logic"}), 400

        cursor.execute("SELECT user_id FROM Users WHERE user_id=%s", (user_id,))
        if cursor.fetchone():
            return jsonify({"error": "User already exists"}), 409
        
        hashed_password = generate_password_hash(password)

        query = """
        INSERT INTO Users (user_id, password, role, first_name, last_name, gender)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        value = (user_id, hashed_password, role, first_name, last_name, gender)

        cursor.execute(query, value)
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": f"User registered successfully",
            "user_id": user_id
        }), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


#b. User Login /login [POST] 
@app.route('/user/login', methods=['POST'])
def login_user():
    try:
        data = request.get_json()

        #Check required fields
        if not data or 'user_id' not in data or 'password' not in data:
            return jsonify({"error": "Missing user id or password"}), 400

        user_id = data['user_id']
        password = data['password']

        conn = get_db_connection()
        cursor = conn.cursor()

        query = "SELECT user_id, password, role FROM Users WHERE user_id=%s"
        cursor.execute(query, (user_id,))
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if user and check_password_hash(user[1], password):
            access_token = create_access_token(
                identity=str(user[0]),
                additional_claims={"role": user[2]}
            )

            return jsonify({
                "message": "Login successful",
                "token": access_token
            }), 200
        else:
            return jsonify({"error": "Invalid user_id or password"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#c. Create Course /course/create [POST]
@app.route('/course/create', methods=['POST'])
@admin_required
def create_course():
    try:
        data = request.get_json()

        if not data or 'title' not in data:
            return jsonify({"error": "Missing Course Title name"}), 400
        
        
        title = data['title']
        lecturer_id = data.get('lecturer_id') or None

        conn = get_db_connection()
        cursor = conn.cursor()

        #Lecturer
        if lecturer_id:
            cursor.execute("SELECT user_id FROM Users WHERE user_id=%s AND role='lecturer'",
                (lecturer_id,)
            )   
            if not cursor.fetchone():
                return jsonify({"error": "Invalid lecturer_id"}), 400

        #check lecturer in course capacity  
        if lecturer_id:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM Course 
                WHERE lecturer_id = %s
            """, (lecturer_id,))

        count = cursor.fetchone()[0]
        if count >= 5:
            return jsonify({"error": "Lecturer cannot teach more than 5 courses"}), 400

        #create course
        cursor.execute("SELECT MAX(course_id) FROM Course")
        result = cursor.fetchone()[0]
        course_id = 1 if result is None else result + 1

        cursor.execute("""
            INSERT INTO Course (course_id, title, lecturer_id)
            VALUES (%s, %s, %s)
        """, (course_id, title, lecturer_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "message": "Course created successfully",
            "course_id": course_id
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

#d. Retrieve Courses  [GET]
#Retrieve all the courses 
@app.route('/courses', methods=['GET'])
def get_all_courses():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT course_id, title, lecturer_id FROM Course")
        data = cursor.fetchall()

        cursor.close()
        conn.close()

        courses = []
        for c in data:
            courses.append({
                "course_id": c[0],
                "title": c[1],
                "lecturer_id": c[2]
            })

        return jsonify(courses), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

#Retrieve courses for a particular student 
@app.route('/courses/student/<int:student_id>', methods=['GET'])
def get_student_courses(student_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.course_id, c.title, c.lecturer_id
            FROM Course c
            JOIN Registration r ON c.course_id = r.course_id
            WHERE r.user_id = %s
        """, (student_id,))

        data = cursor.fetchall()

        cursor.close()
        conn.close()

        courses = []
        for c in data:
            courses.append({
                "course_id": c[0],
                "title": c[1],
                "lecturer_id": c[2]
            })
        return jsonify(courses), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

#Retrieve courses taught by a particular lecturer 
@app.route('/courses/lecturer/<int:lecturer_id>', methods=['GET'])
def get_lecturer_courses(lecturer_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT course_id, title, lecturer_id
            FROM Course
            WHERE lecturer_id = %s
        """, (lecturer_id,))

        data = cursor.fetchall()

        cursor.close()
        conn.close()

        courses = []
        for c in data:
            courses.append({
                "course_id": c[0],
                "title": c[1],
                "lecturer_id": c[2]
            })
        return jsonify(courses), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#e. Register for Courses /course/register [POST]
@app.route('/course/register', methods=['POST'])
def register_for_course():
    try:
        data = request.get_json()

        if not data or 'student_id' not in data or 'course_id' not in data:
            return jsonify({"error": "Missing student_id or course_id"}), 400

        student_id = data['student_id']
        course_id = data['course_id']

        conn = get_db_connection()
        cursor = conn.cursor()

        #Check if student already exists
        cursor.execute("SELECT user_id FROM Users WHERE user_id=%s AND role='student'", (student_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Invalid student_id"}), 400

        #Check if course already exists
        cursor.execute("SELECT title FROM Course WHERE course_id=%s", (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"error": "Invalid course_id"}), 400
        title = course[0]

        #Check if already registered
        cursor.execute("""
            SELECT * FROM Registration 
            WHERE user_id=%s AND course_id=%s
        """, (student_id, course_id))
        if cursor.fetchone():
            return jsonify({"error": f"Student already registered for {title}"}), 409
        
        #Check if student's course amount 
        cursor.execute("""
            SELECT COUNT(*) 
            FROM Registration 
            WHERE user_id = %s
        """, (student_id,))

        count = cursor.fetchone()[0]
        if count >= 6:
            return jsonify({"error": "Student cannot register for more than 6 courses"}), 400

        #register
        cursor.execute("""
            INSERT INTO Registration (user_id, course_id)
            VALUES (%s, %s)
        """, (student_id, course_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "message": "Student successfully registered for course",
            "course_id": course_id,
            "title": title,
            "student_id": student_id
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#f. Retrieve Members
@app.route('/course/<int:course_id>/members', methods=['GET'])
def get_course_members(course_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        members = []

        #Course title 
        cursor.execute("SELECT title FROM Course WHERE course_id = %s", (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"error": "Course not found"}), 404

        title = course[0]

        #Lecturer
        cursor.execute("""
            SELECT u.user_id, u.first_name, u.last_name
            FROM Course c
            JOIN Users u ON c.lecturer_id = u.user_id
            WHERE c.course_id = %s
        """, (course_id,))

        lecturer = cursor.fetchone()
        if lecturer:
            members.append({
                "user_id": lecturer[0],
                "first_name": lecturer[1],
                "last_name": lecturer[2],
                "role": "lecturer"
            })

        #Students
        cursor.execute("""
            SELECT u.user_id, u.first_name, u.last_name
            FROM Registration r
            JOIN Users u ON r.user_id = u.user_id
            WHERE r.course_id = %s
        """, (course_id,))

        students = cursor.fetchall()

        for s in students:
            members.append({
                "user_id": s[0],
                "first_name": s[1],
                "last_name": s[2],
                "role": "student"
            })

        cursor.close()
        conn.close()

        return jsonify({
            "title": title,
            "course_id": course_id,
            "members": members
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

#g. Retrieve Calendar Events 
#h. Create Calendar Events 
#i. Forums
#j. Discussion Thread
#k. Course Content 
#l. Assignments 
#m. Reports
if __name__ == "__main__":
    app.run(debug=True)