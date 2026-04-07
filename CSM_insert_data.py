import names 
import random
from faker import Faker

fake = Faker()

NUM_STUDENTS = 100_000
NUM_LECTURERS = 50
NUM_COURSES = 200

MIN_COURSES_PER_STUDENT = 3
MAX_COURSES_PER_STUDENT = 6
MIN_STUDENTS_PER_COURSE = 10
MAX_COURSES_PER_LECTURER = 5


#Generate Student
with open("insert_students.sql", "w") as f_student:
    for i in range(1, NUM_STUDENTS + 1):
        gender = random.choice(["male", "female"])
        first_name = names.get_first_name(gender=gender)
        last_name = names.get_last_name()
        user_id = 26000000 + i 
        password = f"stu_password{i}"
        role = "student"

        query = f"INSERT INTO Users (user_id, password, role, first_name, last_name, gender) " \
                f"VALUES ({user_id}, '{password}', '{role}', '{first_name}', '{last_name}', '{gender}');\n"
        f_student.write(query)

print("Students SQL file generated!")

#Generate Lecturers 
with open("insert_lecturers.sql", "w") as f_lecturers:
    for i in range(1, NUM_LECTURERS + 1):
        gender = random.choice(["male", "female"])
        first_name = names.get_first_name(gender=gender)
        last_name = names.get_last_name()
        user_id = 2026000 + i 
        password = f"lec_password{i}"
        role = "lecturer"

        query = f"INSERT INTO Users (user_id, password, role, first_name, last_name, gender) " \
                f"VALUES ({user_id}, '{password}', '{role}', '{first_name}', '{last_name}', '{gender}');\n"
        f_lecturers.write(query)

print("Lecturers SQL file generated!")

#Generate Courses 
# Track how many courses each lecturer is assigned
lecturer_course_count = [0] * NUM_LECTURERS
course_lecturer_ids = []

with open("insert_courses.sql", "w") as f_courses:
    # each lecturer gets 1 course
    for i in range(NUM_LECTURERS):
        subject = fake.word().capitalize()
        level = random.choice(["Introduction to", "Advanced", "Fundamentals of", "Basics of", "Principles of"])
        course_name = f"{level} {subject}"

        lecturer_id = 2026001 + i
        lecturer_course_count[i] += 1
        course_lecturer_ids.append(lecturer_id)

        query = f"INSERT INTO Course (title, lecturer_id) VALUES ('{course_name}', {lecturer_id});\n"
        f_courses.write(query)

    #remaining courses
    for course_id in range(NUM_LECTURERS + 1, NUM_COURSES + 1):
        subject = fake.word().capitalize()
        level = random.choice(["Introduction to", "Advanced", "Fundamentals of", "Basics of", "Principles of"])
        course_name = f"{level} {subject}"

        assigned = False
        while not assigned:
            lecturer_index = random.randint(0, NUM_LECTURERS - 1)
            if lecturer_course_count[lecturer_index] < MAX_COURSES_PER_LECTURER:
                lecturer_course_count[lecturer_index] += 1
                lecturer_id = 2026001 + lecturer_index
                course_lecturer_ids.append(lecturer_id)
                assigned = True
        
        query = f"INSERT INTO Course (title, lecturer_id) VALUES ('{course_name}', {lecturer_id});\n"
        f_courses.write(query)

print("Courses SQL file generated!")

#Registration 
registrations = [set() for _ in range(NUM_COURSES)]
student_course_count = [0] * NUM_STUDENTS  # Track courses per student

with open("insert_registrations.sql", "w") as f_reg:
    #Assign 3-6 courses per student
    for student_offset in range(NUM_STUDENTS):

        student_id = 26000001 + student_offset
        num_courses = random.randint(MIN_COURSES_PER_STUDENT, MAX_COURSES_PER_STUDENT)
        
        chosen_courses = random.sample(range(1, NUM_COURSES + 1), num_courses)

        for course_id in chosen_courses:
            registrations[course_id - 1].add(student_id)
            student_course_count[student_offset] += 1
            query = f"INSERT INTO Registration (user_id, course_id) VALUES ({student_id}, {course_id});\n"
            f_reg.write(query)

    #Ensure each course has at least 10 students
    for course_id, students in enumerate(registrations, start=1):
        while len(students) < MIN_STUDENTS_PER_COURSE:
            #Pick a student who has less than 6 courses
            extra_student_offset = random.randint(0, NUM_STUDENTS - 1)
            if student_course_count[extra_student_offset] < MAX_COURSES_PER_STUDENT:
                extra_student_id = 26000001 + extra_student_offset
                if extra_student_id not in students:
                    students.add(extra_student_id)
                    student_course_count[extra_student_offset] += 1
                    query = f"INSERT INTO Registration (user_id, course_id) VALUES ({extra_student_id}, {course_id});\n"
                    f_reg.write(query)

print("Registration SQL file generated!")