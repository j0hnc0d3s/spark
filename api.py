from flask import Flask, request, jsonify
from db_connector import get_db_connection

app = Flask(__name__)
app.json.sort_keys = False

MEMBER = {"admin", "lecturer", "student"}

#a. Register User /register [POST]
@app.route('/user/register', methods=['POST'])
def register_user():
    try:
        data = request.get_json()

        #Check required fields
        required_fields = ['user_id', 'password', 'role', 'first_name', 'last_name', 'gender']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400
            
        user_id = data['user_id']
        password = data['password']
        role = data['role']
        first_name = data['first_name']
        last_name = data['last_name']
        gender = data['gender']

        #Validate role
        if role not in MEMBER:
            return jsonify({"error": f"Invalid role"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
        INSERT INTO Users (user_id, password, role, first_name, last_name, gender)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        value = (user_id, password, role, first_name, last_name, gender)

        cursor.execute(query, value)
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": f"User registered successfully"}), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#b. User Login /login [POST] 
@app.route('/user/login', methods=['POST'])
def login_user():
    try:
        data = request.get_json()

        #Check required fields
        required_fields = ['user_id', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400

        user_id = data['user_id']
        password = data['password']

        conn = get_db_connection()
        cursor = conn.cursor()

        query = "SELECT user_id, role, first_name, last_name FROM Users WHERE user_id=%s AND password=%s"
        value = (user_id, password)
        cursor.execute(query, value)
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if user:
            if user[1] not in MEMBER:
                return jsonify({"error": "Invalid role in database"}), 400

            return jsonify({
                "message": "Login successful",
                "user": {
                    "user_id": user[0],
                    "role": user[1],
                    "first_name": user[2],
                    "last_name": user[3]
                }
            }), 200
        else:
            return jsonify({"error": "Invalid user_id or password"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#c. Create Course 
#d. Retrieve Courses 
#e. Register for Courses
#f. Retrieve Members
#g. Retrieve Calendar Events 
#h. Create Calendar Events 
#i. Forums
#j. Discussion Thread
#k. Course Content 
#l. Assignments 
#m. Reports