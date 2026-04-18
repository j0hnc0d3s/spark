DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ----------------------------------------------------------------------------
-- ENUMs
-- ----------------------------------------------------------------------------
CREATE TYPE user_role    AS ENUM ('admin', 'lecturer', 'student');
CREATE TYPE content_kind AS ENUM ('link', 'file', 'slide');

-- ----------------------------------------------------------------------------
-- USERS  (admin | lecturer | student)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id        VARCHAR(20)  PRIMARY KEY,
    username       VARCHAR(50)  UNIQUE NOT NULL,
    email          VARCHAR(120) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    first_name     VARCHAR(60)  NOT NULL,
    last_name      VARCHAR(60)  NOT NULL,
    role           user_role    NOT NULL,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- COURSES  (exactly one lecturer per course, per spec)
-- ----------------------------------------------------------------------------
CREATE TABLE courses (
    course_id   VARCHAR(20)  PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    lecturer_id VARCHAR(20)  REFERENCES users(user_id) ON DELETE SET NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- REGISTRATIONS  (student ↔ course enrollments)
-- Composite PK prevents duplicate enrollments.
-- ----------------------------------------------------------------------------
CREATE TABLE registrations (
    user_id       VARCHAR(20) REFERENCES users(user_id)     ON DELETE CASCADE,
    course_id     VARCHAR(20) REFERENCES courses(course_id) ON DELETE CASCADE,
    registered_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, course_id)
);

-- ----------------------------------------------------------------------------
-- CALENDAR EVENTS
-- ----------------------------------------------------------------------------
CREATE TABLE calendar_events (
    event_id    SERIAL       PRIMARY KEY,
    course_id   VARCHAR(20)  NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    created_by  VARCHAR(20)  NOT NULL REFERENCES users(user_id),
    title       VARCHAR(200) NOT NULL,
    event_date  DATE         NOT NULL,
    description TEXT
);

-- ----------------------------------------------------------------------------
-- FORUMS
-- ----------------------------------------------------------------------------
CREATE TABLE forums (
    forum_id   SERIAL       PRIMARY KEY,
    course_id  VARCHAR(20)  NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- THREADS  (live inside a forum)
-- ----------------------------------------------------------------------------
CREATE TABLE threads (
    thread_id  SERIAL       PRIMARY KEY,
    forum_id   INT          NOT NULL REFERENCES forums(forum_id) ON DELETE CASCADE,
    created_by VARCHAR(20)  NOT NULL REFERENCES users(user_id),
    title      VARCHAR(200) NOT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- POSTS  (self-referencing for reddit-style nested replies)
-- A NULL parent_post_id = top-level post on the thread.
-- ----------------------------------------------------------------------------
CREATE TABLE posts (
    post_id        SERIAL      PRIMARY KEY,
    thread_id      INT         NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
    created_by     VARCHAR(20) NOT NULL REFERENCES users(user_id),
    content        TEXT        NOT NULL,
    parent_post_id INT         REFERENCES posts(post_id) ON DELETE CASCADE,
    created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- SECTIONS  (organize course content)
-- ----------------------------------------------------------------------------
CREATE TABLE sections (
    section_id    SERIAL       PRIMARY KEY,
    course_id     VARCHAR(20)  NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    display_order INT          DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- CONTENT ITEMS  (links | files | slides)
-- ----------------------------------------------------------------------------
CREATE TABLE content_items (
    content_id   SERIAL        PRIMARY KEY,
    section_id   INT           NOT NULL REFERENCES sections(section_id) ON DELETE CASCADE,
    content_type content_kind  NOT NULL,
    title        VARCHAR(200),
    content      TEXT          NOT NULL,   -- URL / file path / slide link
    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- ASSIGNMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE assignments (
    assignment_id SERIAL       PRIMARY KEY,
    course_id     VARCHAR(20)  NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    due_date      DATE         NOT NULL,
    max_score     INT          NOT NULL DEFAULT 100 CHECK (max_score > 0)
);

-- ----------------------------------------------------------------------------
-- SUBMISSIONS  (one per student per assignment)
-- ----------------------------------------------------------------------------
CREATE TABLE submissions (
    submission_id SERIAL       PRIMARY KEY,
    assignment_id INT          NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    student_id    VARCHAR(20)  NOT NULL REFERENCES users(user_id)             ON DELETE CASCADE,
    file_path     VARCHAR(500),
    submitted_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (assignment_id, student_id)
);

-- ----------------------------------------------------------------------------
-- GRADES  (one per submission; feeds the student's final average)
-- ----------------------------------------------------------------------------
CREATE TABLE grades (
    grade_id      SERIAL        PRIMARY KEY,
    submission_id INT           UNIQUE NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
    lecturer_id   VARCHAR(20)   NOT NULL REFERENCES users(user_id),
    score         DECIMAL(5,2)  NOT NULL CHECK (score >= 0 AND score <= 100),
    graded_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES  (performance for FK lookups & common query paths)
-- ============================================================================
CREATE INDEX idx_users_role               ON users(role);
CREATE INDEX idx_courses_lecturer         ON courses(lecturer_id);
CREATE INDEX idx_registrations_user       ON registrations(user_id);
CREATE INDEX idx_registrations_course     ON registrations(course_id);
CREATE INDEX idx_calendar_course          ON calendar_events(course_id);
CREATE INDEX idx_calendar_date            ON calendar_events(event_date);
CREATE INDEX idx_forums_course            ON forums(course_id);
CREATE INDEX idx_threads_forum            ON threads(forum_id);
CREATE INDEX idx_posts_thread             ON posts(thread_id);
CREATE INDEX idx_posts_parent             ON posts(parent_post_id);
CREATE INDEX idx_sections_course          ON sections(course_id);
CREATE INDEX idx_content_section          ON content_items(section_id);
CREATE INDEX idx_assignments_course       ON assignments(course_id);
CREATE INDEX idx_submissions_assignment   ON submissions(assignment_id);
CREATE INDEX idx_submissions_student      ON submissions(student_id);
CREATE INDEX idx_grades_submission        ON grades(submission_id);

-- ============================================================================
-- REPORTING VIEWS  (the 5 required by the COMP3161 spec)
-- ============================================================================

-- 1. All courses that have 50 or more students
CREATE OR REPLACE VIEW v_courses_50_plus_students AS
SELECT  c.course_id,
        c.title,
        COUNT(r.user_id) AS student_count
FROM    courses c
JOIN    registrations r ON c.course_id = r.course_id
JOIN    users u         ON r.user_id   = u.user_id
WHERE   u.role = 'student'
GROUP BY c.course_id, c.title
HAVING  COUNT(r.user_id) >= 50
ORDER BY student_count DESC;

-- 2. All students that do 5 or more courses
CREATE OR REPLACE VIEW v_students_5_plus_courses AS
SELECT  u.user_id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(r.course_id) AS course_count
FROM    users u
JOIN    registrations r ON u.user_id = r.user_id
WHERE   u.role = 'student'
GROUP BY u.user_id, u.username, u.first_name, u.last_name
HAVING  COUNT(r.course_id) >= 5
ORDER BY course_count DESC;

-- 3. All lecturers that teach 3 or more courses
CREATE OR REPLACE VIEW v_lecturers_3_plus_courses AS
SELECT  u.user_id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(c.course_id) AS course_count
FROM    users u
JOIN    courses c ON u.user_id = c.lecturer_id
WHERE   u.role = 'lecturer'
GROUP BY u.user_id, u.username, u.first_name, u.last_name
HAVING  COUNT(c.course_id) >= 3
ORDER BY course_count DESC;

-- 4. The 10 most enrolled courses
CREATE OR REPLACE VIEW v_top_10_enrolled_courses AS
SELECT  c.course_id,
        c.title,
        COUNT(r.user_id) AS enrollment_count
FROM    courses c
LEFT JOIN registrations r ON c.course_id = r.course_id
LEFT JOIN users u         ON r.user_id   = u.user_id AND u.role = 'student'
GROUP BY c.course_id, c.title
ORDER BY enrollment_count DESC
LIMIT 10;

-- 5. The top 10 students with the highest overall averages
CREATE OR REPLACE VIEW v_top_10_students_by_average AS
SELECT  u.user_id,
        u.username,
        u.first_name,
        u.last_name,
        ROUND(AVG(g.score), 2) AS overall_average,
        COUNT(g.grade_id)      AS graded_count
FROM    users u
JOIN    submissions s ON u.user_id = s.student_id
JOIN    grades g      ON s.submission_id = g.submission_id
WHERE   u.role = 'student'
GROUP BY u.user_id, u.username, u.first_name, u.last_name
ORDER BY overall_average DESC
LIMIT 10;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
