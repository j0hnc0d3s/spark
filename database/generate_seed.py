"""
Generates a PostgreSQL seed file (seed.sql) that satisfies every data
constraint in the project brief:

    - >= 100,000 students
    - >= 200 courses
    - Each student enrolled in 3..6 courses
    - Each course has >= 10 members
    - Each lecturer teaches 1..5 courses
    - Lecturers present
    - Admin accounts present

It also populates downstream entities (forums, threads, posts, sections,
content, assignments, submissions, grades, calendar events) with realistic
fixture volumes so every API endpoint has data to return.

Run:
    python3 generate_seed.py
Outputs:
    seed.sql   (multi-row INSERTs, batched)

"""

import random
import hashlib
import os
from datetime import date, timedelta

# -----------------------------------------------------------------------------
# CONFIGURATION  -- tweak these to change volume
# -----------------------------------------------------------------------------
NUM_STUDENTS        = 100_000
NUM_LECTURERS       = 50
NUM_ADMINS          = 5
NUM_COURSES         = 200

COURSES_PER_STUDENT = (3, 6)     # inclusive range
COURSES_PER_LECT    = (1, 5)
MIN_MEMBERS_COURSE  = 10         # enforced after the fact

SECTIONS_PER_COURSE    = (3, 5)
CONTENT_PER_SECTION    = (2, 4)
ASSIGNMENTS_PER_COURSE = (2, 3)
EVENTS_PER_COURSE      = (2, 4)
THREADS_PER_FORUM      = (2, 4)
TOP_POSTS_PER_THREAD   = (2, 5)
REPLIES_PER_POST       = (0, 3)  # nested depth 1 (replies to top-level)

# Only a subset of enrolled students submits per assignment
SUBMISSIONS_PER_ASSIGN = (30, 80)
GRADED_FRACTION        = 0.80    # 80% of submissions get graded

BATCH_SIZE          = 1000       # rows per multi-row INSERT
OUTPUT_FILE         = 'seed.sql'
RANDOM_SEED         = 3161       # reproducible

# -----------------------------------------------------------------------------
# NAME POOLS  (kept small; we cycle with suffixes to stay compact)
# -----------------------------------------------------------------------------
FIRST_NAMES = [
    'Aiden','Aaliyah','Ajani','Amara','Andre','Asha','Brian','Brianna','Camille',
    'Chanel','Daniel','Daniella','David','Deon','Destiny','Elijah','Emma','Ethan',
    'Gabriel','Gabrielle','Isaiah','Jada','Jaden','Jasmine','Joshua','Kadeem',
    'Kai','Kayla','Keisha','Kemar','Kenya','Khalil','Kiana','Kyle','Leah',
    'Liam','Malcolm','Maya','Micah','Nia','Noah','Olivia','Omar','Rashan',
    'Renee','Rhea','Rohan','Sasha','Shania','Shanice','Simone','Tajay','Tamara',
    'Tariq','Tavia','Tyrone','Zara','Joseph','Isabelle','Darius','Naomi'
]
LAST_NAMES = [
    'Bailey','Brown','Campbell','Clarke','Cooper','Daley','Davis','Ellis',
    'Ferguson','Gordon','Grant','Gray','Green','Hall','Harris','Hart','Henry',
    'Jackson','James','Johnson','Jones','Joseph','King','Lewis','Lynch',
    'Martin','McKenzie','Miller','Mitchell','Morgan','Morris','Nelson',
    'Palmer','Parker','Phillips','Powell','Reid','Roberts','Robinson','Russell',
    'Scott','Simpson','Smith','Spence','Stewart','Taylor','Thomas','Thompson',
    'Walker','Walters','Ward','Watson','Williams','Wilson','Wright','Young'
]
COURSE_SUBJECTS = [
    'Introduction to','Principles of','Foundations of','Advanced','Applied',
    'Topics in','Essentials of','Studies in','Survey of','Fundamentals of'
]
COURSE_AREAS = [
    'Computing','Software Engineering','Databases','Algorithms','Networks',
    'Mathematics','Statistics','Physics','Chemistry','Biology',
    'Psychology','Sociology','Economics','Finance','Accounting',
    'Management','Marketing','Law','Political Science','History',
    'Literature','Linguistics','Philosophy','Ethics','Environmental Science',
    'Music Theory','Film Studies','Art History','Cultural Studies','Education'
]
FORUM_TITLES = ['General Discussion', 'Q&A', 'Announcements', 'Study Group']
THREAD_TITLES = [
    'Need help with Assignment 1', 'Office hours this week?',
    'Clarification on the syllabus', 'Study group forming',
    'Readings for next class', 'Exam format question',
    'Can someone explain this concept?', 'Project group partners',
    'Late submission policy', 'Tips for the midterm'
]
POST_CONTENT = [
    'Great question -- I was wondering the same thing.',
    'Check the course outline, it is covered in section 3.',
    'I found this resource really helpful: [link].',
    'Same here, looking for a group.',
    'The lecturer addressed this in the last class, recording should be up.',
    'I would argue the opposite. Consider the edge case where...',
    'Thanks for clarifying!',
    'Please email the lecturer directly for accommodations.',
    'The reading list is on the course page under Resources.',
    'Anyone have notes from last Friday?'
]
SECTION_TITLES = [
    'Week 1: Introduction','Week 2: Core Concepts','Week 3: Deep Dive',
    'Week 4: Applications','Week 5: Case Studies','Week 6: Midterm Review',
    'Lab Resources','Supplementary Reading'
]
ASSIGNMENT_TITLES = [
    'Assignment 1','Assignment 2','Lab Project','Midterm Report',
    'Final Project','Group Presentation'
]
EVENT_TITLES = [
    'Lecture','Tutorial','Lab Session','Guest Speaker','Review Session',
    'Midterm Exam','Quiz','Office Hours'
]

# -----------------------------------------------------------------------------
# UTILITIES
# -----------------------------------------------------------------------------
def sql_escape(s):
    """Escape single quotes for safe SQL literal inclusion."""
    return str(s).replace("'", "''")

def fake_hash(plaintext):
    """Deterministic fake bcrypt-style hash for seeding. Real API uses bcrypt."""
    return '$2b$12$' + hashlib.sha256(plaintext.encode()).hexdigest()[:53]

def write_batch(out, table, columns, rows):
    """Write a batched multi-row INSERT."""
    if not rows:
        return
    out.write(f"INSERT INTO {table} ({', '.join(columns)}) VALUES\n")
    out.write(',\n'.join(f"    {r}" for r in rows))
    out.write(';\n\n')

def batched_insert(out, table, columns, rows, batch_size=BATCH_SIZE):
    """Split a list of pre-formatted value-tuple strings into batched inserts."""
    for i in range(0, len(rows), batch_size):
        write_batch(out, table, columns, rows[i:i + batch_size])

def rand_date_between(start, end):
    return start + timedelta(days=random.randint(0, (end - start).days))

# -----------------------------------------------------------------------------
# MAIN GENERATION PIPELINE
# -----------------------------------------------------------------------------
def main():
    random.seed(RANDOM_SEED)

    out = open(OUTPUT_FILE, 'w', encoding='utf-8')
    out.write('-- =====================================================\n')
    out.write('-- Spark  |  Seed Data  (generated by generate_seed.py)\n')
    out.write('-- =====================================================\n\n')
    out.write('BEGIN;\n\n')

    # -----------------------------------------------------------------
    # 1. USERS
    # -----------------------------------------------------------------
    print('[1/8] Users...')

    users_rows = []

    admin_ids = []
    for i in range(1, NUM_ADMINS + 1):
        uid = f'A{i:03d}'
        admin_ids.append(uid)
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        uname = f'admin{i:02d}'
        email = f'{uname}@spark.edu'
        phash = fake_hash(f'admin{i}')
        users_rows.append(
            f"('{uid}', '{uname}', '{email}', '{phash}', "
            f"'{sql_escape(fn)}', '{sql_escape(ln)}', 'admin')"
        )

    lecturer_ids = []
    for i in range(1, NUM_LECTURERS + 1):
        uid = f'L{i:03d}'
        lecturer_ids.append(uid)
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        uname = f'lect{i:03d}'
        email = f'{uname}@spark.edu'
        phash = fake_hash(f'lect{i}')
        users_rows.append(
            f"('{uid}', '{uname}', '{email}', '{phash}', "
            f"'{sql_escape(fn)}', '{sql_escape(ln)}', 'lecturer')"
        )

    student_ids = []
    for i in range(1, NUM_STUDENTS + 1):
        uid = f'S{i:07d}'
        student_ids.append(uid)
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        uname = f'stu{i:07d}'
        email = f'{uname}@spark.edu'
        phash = fake_hash(f'pw{i}')
        users_rows.append(
            f"('{uid}', '{uname}', '{email}', '{phash}', "
            f"'{sql_escape(fn)}', '{sql_escape(ln)}', 'student')"
        )

    batched_insert(
        out, 'users',
        ['user_id','username','email','password_hash','first_name','last_name','role'],
        users_rows
    )
    print(f'     {len(users_rows):,} users written')

    # -----------------------------------------------------------------
    # 2. COURSES  (assigning lecturers with 1..5 course cap)
    # -----------------------------------------------------------------
    print('[2/8] Courses...')

    # Build a lecturer -> course count plan that sums to NUM_COURSES
    # Start with 1 course each (guarantees each lecturer teaches >= 1)
    lecturer_load = {lid: 1 for lid in lecturer_ids}
    assigned = len(lecturer_ids)
    # Distribute remainder with cap at 5 per lecturer
    while assigned < NUM_COURSES:
        lid = random.choice(lecturer_ids)
        if lecturer_load[lid] < COURSES_PER_LECT[1]:
            lecturer_load[lid] += 1
            assigned += 1

    # Now enumerate the courses
    courses_rows = []
    course_ids = []
    lecturer_by_course = {}

    course_counter = 1
    for lid, n in lecturer_load.items():
        for _ in range(n):
            cid = f'CRS{course_counter:04d}'
            course_ids.append(cid)
            lecturer_by_course[cid] = lid
            title = f"{random.choice(COURSE_SUBJECTS)} {random.choice(COURSE_AREAS)}"
            courses_rows.append(
                f"('{cid}', '{sql_escape(title)}', '{lid}')"
            )
            course_counter += 1

    random.shuffle(courses_rows)  # mix lecturer ownership in insert order
    batched_insert(out, 'courses', ['course_id','title','lecturer_id'], courses_rows)
    print(f'     {len(courses_rows):,} courses written')

    # -----------------------------------------------------------------
    # 3. REGISTRATIONS  (students enrolling; 3..6 courses each; >=10 per course)
    # -----------------------------------------------------------------
    print('[3/8] Registrations...')

    enrollments = []        # list of (student_id, course_id)
    course_enrollment = {cid: set() for cid in course_ids}

    for sid in student_ids:
        n = random.randint(*COURSES_PER_STUDENT)
        picks = random.sample(course_ids, n)
        for cid in picks:
            enrollments.append((sid, cid))
            course_enrollment[cid].add(sid)

    # Safety net: ensure every course has >= MIN_MEMBERS_COURSE
    # (statistically virtually impossible with 100K x 4.5 avg over 200 courses
    # to fall below 10, but we enforce explicitly for spec compliance)
    for cid, members in course_enrollment.items():
        while len(members) < MIN_MEMBERS_COURSE:
            sid = random.choice(student_ids)
            if sid not in members:
                members.add(sid)
                enrollments.append((sid, cid))

    reg_rows = [f"('{sid}', '{cid}')" for sid, cid in enrollments]
    batched_insert(out, 'registrations', ['user_id','course_id'], reg_rows)
    print(f'     {len(reg_rows):,} enrollments written')

    # Build a course -> students lookup for downstream (sampled to save memory)
    # We keep the full map since we need it for submissions
    course_students = {cid: list(members) for cid, members in course_enrollment.items()}

    # -----------------------------------------------------------------
    # 4. CALENDAR EVENTS
    # -----------------------------------------------------------------
    print('[4/8] Calendar events...')

    today = date(2026, 1, 20)
    term_end = date(2026, 5, 15)

    events_rows = []
    for cid in course_ids:
        for _ in range(random.randint(*EVENTS_PER_COURSE)):
            title = random.choice(EVENT_TITLES)
            ev_date = rand_date_between(today, term_end)
            created_by = lecturer_by_course[cid]
            events_rows.append(
                f"('{cid}', '{created_by}', '{sql_escape(title)}', "
                f"DATE '{ev_date.isoformat()}', NULL)"
            )
    batched_insert(
        out, 'calendar_events',
        ['course_id','created_by','title','event_date','description'],
        events_rows
    )
    print(f'     {len(events_rows):,} events written')

    # -----------------------------------------------------------------
    # 5. FORUMS + THREADS + POSTS
    # -----------------------------------------------------------------
    print('[5/8] Forums, threads, posts...')

    # One default forum per course (serial IDs start at 1)
    forum_rows = []
    for cid in course_ids:
        title = random.choice(FORUM_TITLES)
        forum_rows.append(f"('{cid}', '{sql_escape(title)}')")
    batched_insert(out, 'forums', ['course_id','title'], forum_rows)

    # Capture course -> forum_id mapping (serial starts at 1, insert order)
    course_forum = {cid: (i + 1) for i, cid in enumerate(course_ids)}

    # Threads (created by enrolled students or the lecturer)
    thread_rows = []
    thread_meta = []   # (thread_id, forum_id, course_id)
    thread_counter = 1
    for cid in course_ids:
        fid = course_forum[cid]
        creators_pool = list(course_students[cid]) + [lecturer_by_course[cid]]
        for _ in range(random.randint(*THREADS_PER_FORUM)):
            t_title = random.choice(THREAD_TITLES)
            creator = random.choice(creators_pool)
            thread_rows.append(f"({fid}, '{creator}', '{sql_escape(t_title)}')")
            thread_meta.append((thread_counter, fid, cid))
            thread_counter += 1
    batched_insert(out, 'threads', ['forum_id','created_by','title'], thread_rows)

    # Posts: for each thread, a handful of top-level posts, plus nested replies
    post_rows = []
    post_counter = 1
    for (tid, fid, cid) in thread_meta:
        creators_pool = list(course_students[cid]) + [lecturer_by_course[cid]]
        num_top = random.randint(*TOP_POSTS_PER_THREAD)
        top_ids = []
        for _ in range(num_top):
            content = random.choice(POST_CONTENT)
            author = random.choice(creators_pool)
            # parent_post_id = NULL for top-level
            post_rows.append(
                f"({tid}, '{author}', '{sql_escape(content)}', NULL)"
            )
            top_ids.append(post_counter)
            post_counter += 1
        # Replies to top-level posts
        for parent_id in top_ids:
            for _ in range(random.randint(*REPLIES_PER_POST)):
                content = random.choice(POST_CONTENT)
                author = random.choice(creators_pool)
                post_rows.append(
                    f"({tid}, '{author}', '{sql_escape(content)}', {parent_id})"
                )
                post_counter += 1
    batched_insert(
        out, 'posts',
        ['thread_id','created_by','content','parent_post_id'],
        post_rows
    )
    print(f'     {len(forum_rows):,} forums / {len(thread_rows):,} threads / {len(post_rows):,} posts')

    # -----------------------------------------------------------------
    # 6. SECTIONS + CONTENT
    # -----------------------------------------------------------------
    print('[6/8] Sections and content...')

    section_rows = []
    section_meta = []   # (section_id, course_id)
    sec_counter = 1
    for cid in course_ids:
        n = random.randint(*SECTIONS_PER_COURSE)
        for order, title in enumerate(random.sample(SECTION_TITLES, k=n), start=1):
            section_rows.append(f"('{cid}', '{sql_escape(title)}', {order})")
            section_meta.append((sec_counter, cid))
            sec_counter += 1
    batched_insert(out, 'sections', ['course_id','title','display_order'], section_rows)

    content_rows = []
    kinds = ['link','file','slide']
    content_samples = {
        'link': ['https://spark.edu/resources/week1', 'https://docs.spark.edu/ref/a', 'https://spark.edu/readings/x'],
        'file': ['/uploads/week1_notes.pdf', '/uploads/lab_handout.pdf', '/uploads/reading.pdf'],
        'slide':['https://slides.spark.edu/w1', 'https://slides.spark.edu/w2', 'https://slides.spark.edu/w3']
    }
    for (sid, _cid) in section_meta:
        for _ in range(random.randint(*CONTENT_PER_SECTION)):
            kind = random.choice(kinds)
            item = random.choice(content_samples[kind])
            title = f'{kind.capitalize()} Resource'
            content_rows.append(
                f"({sid}, '{kind}', '{sql_escape(title)}', '{sql_escape(item)}')"
            )
    batched_insert(
        out, 'content_items',
        ['section_id','content_type','title','content'],
        content_rows
    )
    print(f'     {len(section_rows):,} sections / {len(content_rows):,} content items')

    # -----------------------------------------------------------------
    # 7. ASSIGNMENTS
    # -----------------------------------------------------------------
    print('[7/8] Assignments...')

    assignment_rows = []
    assignment_meta = []   # (assignment_id, course_id)
    asg_counter = 1
    for cid in course_ids:
        for _ in range(random.randint(*ASSIGNMENTS_PER_COURSE)):
            title = random.choice(ASSIGNMENT_TITLES)
            due = rand_date_between(today, term_end)
            assignment_rows.append(
                f"('{cid}', '{sql_escape(title)}', NULL, DATE '{due.isoformat()}', 100)"
            )
            assignment_meta.append((asg_counter, cid))
            asg_counter += 1
    batched_insert(
        out, 'assignments',
        ['course_id','title','description','due_date','max_score'],
        assignment_rows
    )
    print(f'     {len(assignment_rows):,} assignments')

    # -----------------------------------------------------------------
    # 8. SUBMISSIONS + GRADES
    # -----------------------------------------------------------------
    print('[8/8] Submissions and grades...')

    submission_rows = []
    submission_meta = []   # (submission_id, student_id, course_id)
    sub_counter = 1
    for (aid, cid) in assignment_meta:
        enrolled = course_students[cid]
        if not enrolled:
            continue
        n_sub = min(random.randint(*SUBMISSIONS_PER_ASSIGN), len(enrolled))
        submitters = random.sample(enrolled, n_sub)
        for sid in submitters:
            path = f"/submissions/{aid}/{sid}.pdf"
            submission_rows.append(
                f"({aid}, '{sid}', '{path}')"
            )
            submission_meta.append((sub_counter, sid, cid))
            sub_counter += 1
    batched_insert(
        out, 'submissions',
        ['assignment_id','student_id','file_path'],
        submission_rows
    )

    # Grades (~GRADED_FRACTION of submissions graded)
    grade_rows = []
    for (subid, student_id, course_id) in submission_meta:
        if random.random() < GRADED_FRACTION:
            lect = lecturer_by_course[course_id]
            score = round(random.uniform(50.0, 100.0), 2)
            grade_rows.append(f"({subid}, '{lect}', {score})")
    batched_insert(out, 'grades', ['submission_id','lecturer_id','score'], grade_rows)
    print(f'     {len(submission_rows):,} submissions / {len(grade_rows):,} grades')

    # -----------------------------------------------------------------
    # Verification + COMMIT
    # -----------------------------------------------------------------
    out.write('-- Verification counts (useful for sanity-checking a load)\n')
    for tbl in ['users','courses','registrations','calendar_events',
                'forums','threads','posts','sections','content_items',
                'assignments','submissions','grades']:
        out.write(f"-- SELECT COUNT(*) FROM {tbl};\n")
    out.write('\nCOMMIT;\n')
    out.close()

    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f'\nDone. {OUTPUT_FILE} written ({size_mb:.1f} MB)')

if __name__ == '__main__':
    main()
