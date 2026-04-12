import names 
import random
from werkzeug.security import generate_password_hash
from faker import Faker

fake = Faker()

NUM_STUDENTS = 100_000
NUM_LECTURERS = 50
NUM_COURSES = 200

MIN_COURSES_PER_STUDENT = 3
MAX_COURSES_PER_STUDENT = 6
MIN_STUDENTS_PER_COURSE = 10
MAX_COURSES_PER_LECTURER = 5

LECTURER_BASE_ID = 2026000
STUDENT_BASE_ID = 26000000

students = []
lecturers = []
users_sql = []

#Generate Admin 
password = generate_password_hash(
    "admin123",
    method="pbkdf2:sha256:1000",  
    salt_length=4
    )

query = f"INSERT INTO Users (user_id, password, role, first_name, last_name, gender) " \
        f"VALUES (1, '{password}', 'admin', 'System', 'Admin', 'female');"

users_sql.append(query)

#Generate Student
for i in range(1, NUM_STUDENTS + 1):
    user_id = STUDENT_BASE_ID + i
    students.append(user_id)

    gender = random.choice(["male", "female"])
    first_name = names.get_first_name(gender=gender)
    last_name = names.get_last_name()
    
    password = generate_password_hash(
        f"stu_password{i}",
        method="pbkdf2:sha256:1000",  
        salt_length=4
    )
        
    query = f"INSERT INTO Users (user_id, password, role, first_name, last_name, gender) " \
            f"VALUES ({user_id}, '{password}', 'student', '{first_name}', '{last_name}', '{gender}');"
    users_sql.append(query)


#Generate Lecturers 
for i in range(1, NUM_LECTURERS + 1):
    user_id = LECTURER_BASE_ID + i
    lecturers.append(user_id)

    gender = random.choice(["male", "female"])
    first_name = names.get_first_name(gender=gender)
    last_name = names.get_last_name()
    
    password = generate_password_hash(
        f"lec_password{i}",
        method="pbkdf2:sha256:1000",  
        salt_length=4
    )

    query = f"INSERT INTO Users (user_id, password, role, first_name, last_name, gender) " \
            f"VALUES ({user_id}, '{password}', 'lecturer', '{first_name}', '{last_name}', '{gender}');"
    users_sql.append(query)


#Generate Courses 
courses = []
courses_sql = []
# Track how many courses each lecturer is assigned
lecturer_course_count = {i: 0 for i in lecturers}
course_id = 1

# each lecturer gets 1 course
for lecturer_id in lecturers:
    subject = fake.word().capitalize()
    level = random.choice(["Introduction to", "Advanced", "Fundamentals of", "Basics of", "Principles of"])
    course_name = f"{level} {subject}"

    courses.append(course_id)

    query = f"INSERT INTO Course (course_id, title, lecturer_id) VALUES ({course_id}, '{course_name}', {lecturer_id});"
    courses_sql.append(query)

    lecturer_course_count[lecturer_id] += 1
    course_id += 1

    #remaining courses
while course_id <= NUM_COURSES:
    eligible = [
        i for i in lecturers
        if lecturer_course_count[i] < MAX_COURSES_PER_LECTURER
    ]

    lecturer_id = random.choice(eligible)

    subject = fake.word().capitalize()
    level = random.choice(["Introduction to", "Advanced", "Fundamentals of", "Basics of", "Principles of"])
    course_name = f"{level} {subject}"    

    courses.append(course_id)

    query = f"INSERT INTO Course (course_id, title, lecturer_id) VALUES ({course_id}, '{course_name}', {lecturer_id});"
    courses_sql.append(query)

    lecturer_course_count[lecturer_id] += 1
    course_id += 1

#Registration 
registrations = {s: set() for s in students}
course_students = {c: set() for c in courses}

registration_sql = []
available_students = set(students)

def assign(student, course):
    if course in registrations[student]:
        return 

    registrations[student].add(course)
    course_students[course].add(student)

    if len(registrations[student]) >= MAX_COURSES_PER_STUDENT:
        available_students.discard(student)

course_range = {
    student: random.randint(MIN_COURSES_PER_STUDENT, MAX_COURSES_PER_STUDENT)
    for student in students
}

#Each student has at least 3 courses
for student in students:
    while len(registrations[student]) < course_range[student]:
        course = random.choice(courses)
        assign(student, course)
    
#Each course has at least 10 students
for course in courses:
    while len(course_students[course]) < MIN_STUDENTS_PER_COURSE:
        student = random.choice(list(available_students))
        assign(student, course)

for student in students:
    while len(registrations[student]) < MIN_COURSES_PER_STUDENT:
        course = random.choice(courses)
        assign(student, course)
    
for student, courses in registrations.items():
    for course in courses:
        registration_sql.append(
            f"INSERT INTO Registration (user_id, course_id) "
            f"VALUES ({student}, {course});"
        )

with open("users.sql", "w") as f:
    f.write("\n".join(users_sql))

with open("courses.sql", "w") as f:
    f.write("\n".join(courses_sql))

with open("registrations.sql", "w") as f:
    f.write("\n".join(registration_sql))

print("ALL SQL FILES GENERATED SUCCESSFULLY!")