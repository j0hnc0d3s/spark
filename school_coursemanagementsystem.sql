CREATE DATABASE school_cms;
USE  school_cms;

-- Stores all users in the system (students, lecturers, admins)
CREATE TABLE Users (
    user_id INT PRIMARY KEY,  
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','lecturer','student') NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    gender ENUM('male','female')
);

-- Each course is taught by exactly one lecturer
CREATE TABLE Course (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    lecturer_id INT NOT NULL,
    FOREIGN KEY (lecturer_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_course_lecturer ON Course(lecturer_id); -- Index improves performance when retrieving courses by lecturer

-- Many-to-many relationship between students and courses
CREATE TABLE Registration (
    user_id INT,
    course_id INT,
    PRIMARY KEY (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES Course(course_id) ON DELETE CASCADE
);
CREATE INDEX idx_registration_user ON Registration(user_id);
CREATE INDEX idx_registration_course ON Registration(course_id);

-- Assignments belong to a course
CREATE TABLE Assignment (
    assignment_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(100),
    due_date DATE,
    FOREIGN KEY (course_id) REFERENCES Course(course_id) ON DELETE CASCADE
);
CREATE INDEX idx_assignment_course ON Assignment(course_id);

-- Students submit assignments
CREATE TABLE Submission (
    submission_id INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    submitted_time DATETIME,
    submission_file VARCHAR(255),
    FOREIGN KEY (assignment_id) REFERENCES Assignment(assignment_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_submission_student ON Submission(student_id);
CREATE INDEX idx_submission_assignment ON Submission(assignment_id);

CREATE TABLE Grade (
    grade_id INT PRIMARY KEY AUTO_INCREMENT,
    submission_id INT UNIQUE,
    lecturer_id INT NOT NULL,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_grade_submission ON Grade(submission_id);
CREATE INDEX idx_grade_lecturer ON Grade(lecturer_id);


CREATE TABLE Forum (
    forum_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Course(course_id) ON DELETE CASCADE
);

CREATE TABLE Thread (
    thread_id INT PRIMARY KEY AUTO_INCREMENT,
    forum_id INT NOT NULL,
    created_by INT NOT NULL,
    title VARCHAR(255),
    FOREIGN KEY (forum_id) REFERENCES Forum(forum_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_thread_forum ON Thread(forum_id);


CREATE TABLE Post (
    post_id INT PRIMARY KEY AUTO_INCREMENT,
    thread_id INT NOT NULL,
    created_by INT NOT NULL,
    parent_post_id INT NULL,
    content TEXT,
    FOREIGN KEY (thread_id) REFERENCES Thread(thread_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_post_id) REFERENCES Post(post_id) ON DELETE CASCADE
);
CREATE INDEX idx_post_thread ON Post(thread_id);
CREATE INDEX idx_post_parent ON Post(parent_post_id);

CREATE TABLE Section (
    section_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(100),
    FOREIGN KEY (course_id) REFERENCES Course(course_id) ON DELETE CASCADE
);

CREATE TABLE Content (
    content_id INT PRIMARY KEY AUTO_INCREMENT,
    section_id INT NOT NULL,
    content TEXT,
    FOREIGN KEY (section_id) REFERENCES Section(section_id) ON DELETE CASCADE
);

CREATE TABLE CalendarEvent (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    created_by INT NOT NULL,
    title VARCHAR(100),
    event_date DATETIME,
    FOREIGN KEY (course_id) REFERENCES Course(course_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_event_course ON CalendarEvent(course_id);
CREATE INDEX idx_event_date ON CalendarEvent(event_date);