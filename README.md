# Spark

A course management system (OURVLE-style clone). Final project for **COMP3161 — Introduction to Database Management**.

---

## Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Database | PostgreSQL 16, normalized to 3NF, raw SQL only    |
| Backend  | Flask + psycopg2 (no ORM), JWT auth, blueprints   |
| Deploy   | Railway (API + DB), Vercel (frontend, Phase 2)    |

---

## Repository Layout

```
spark/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask factory, blueprint registration
│   │   ├── config.py            # env-loaded DB + JWT config
│   │   ├── db.py                # psycopg2 helpers (query_all, execute, etc.)
│   │   ├── middleware/
│   │   │   ├── auth_required.py # JWT verification decorator
│   │   │   └── role_required.py # admin/lecturer/student gate
│   │   └── routes/
│   │       ├── auth.py          # /register, /login
│   │       ├── courses.py       # courses, registration, members
│   │       ├── events.py        # calendar events
│   │       ├── forums.py        # forums + threads + nested posts
│   │       ├── content.py       # sections + content items
│   │       ├── assignments.py   # assignments + submissions + grades
│   │       └── reports.py       # 5 required views
│   ├── run.py                   # dev entry point
│   ├── wsgi.py                  # gunicorn entry for Railway
│   ├── Procfile                 # Railway process declaration
│   ├── requirements.txt
│   └── .env.example
├── database/
│   ├── schema.sql               # DDL: tables, constraints, indexes, 5 views
│   └── generate_seed.py         # Produces seed.sql (100K+ students, etc.)
├── postman/
│   └── Spark_API.postman_collection.json
├── docs/
│   └── Spark_Documentation.pdf  # ERD, architecture, endpoint specs, contributions
└── README.md
```

---

## Quickstart (Local)

### 1. Database

```bash
# One-time setup
createdb spark
psql spark -f database/schema.sql

# Generate and load the seed (takes ~30 seconds; produces a ~40MB seed.sql)
cd database
python3 generate_seed.py
psql spark -f seed.sql
```

### 2. Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your Postgres credentials and a random JWT_SECRET

python3 run.py
# API is now live at http://localhost:5000
```

### 3. Postman

Import `postman/Spark_API.postman_collection.json`. The **Login** request auto-saves the JWT into a collection variable, so subsequent protected requests work with no manual copy-paste.

Default flow:
1. **Auth > Register** (create an admin)
2. **Auth > Login** (token saved automatically)
3. Use any other request

---

## Data Constraints (auto-satisfied by `generate_seed.py`)

| Requirement                              | Implementation                     |
|------------------------------------------|------------------------------------|
| ≥ 100,000 students                       | `NUM_STUDENTS = 100_000`           |
| ≥ 200 courses                            | `NUM_COURSES = 200`                |
| Student in 3..6 courses                  | Random sample per student          |
| Course has ≥ 10 members                  | Post-pass enforcement loop         |
| Lecturer teaches 1..5 courses            | Load-balanced distribution         |
| Lecturer teaches ≥ 1 course              | Each lecturer seeded with 1 first  |

Run on a fresh database and then verify with the queries in the schema file's verification block.

---

## Endpoints (34 total)

### Auth
| Method | Path        | Access |
|--------|-------------|--------|
| POST   | /register   | Public |
| POST   | /login      | Public |

### Courses
| Method | Path                                       | Access         |
|--------|--------------------------------------------|----------------|
| POST   | /courses                                   | admin          |
| GET    | /courses                                   | Public         |
| GET    | /students/{id}/courses                     | Public         |
| GET    | /lecturers/{id}/courses                    | Public         |
| POST   | /courses/{id}/assign-lecturer              | admin          |
| POST   | /courses/{id}/register                     | student        |
| GET    | /courses/{id}/members                      | Public         |

### Calendar
| Method | Path                                       | Access         |
|--------|--------------------------------------------|----------------|
| POST   | /courses/{id}/events                       | lecturer/admin |
| GET    | /courses/{id}/events                       | Public         |
| GET    | /students/{id}/events?date=YYYY-MM-DD      | Public         |

### Forums / Threads / Posts
| Method | Path                                       | Access         |
|--------|--------------------------------------------|----------------|
| GET    | /courses/{id}/forums                       | Public         |
| POST   | /courses/{id}/forums                       | Authenticated  |
| GET    | /forums/{id}/threads                       | Public         |
| POST   | /forums/{id}/threads                       | Authenticated  |
| GET    | /threads/{id}/posts                        | Public         |
| POST   | /threads/{id}/posts                        | Authenticated  |

### Course Content
| Method | Path                                       | Access         |
|--------|--------------------------------------------|----------------|
| GET    | /courses/{id}/sections                     | Public         |
| POST   | /courses/{id}/sections                     | lecturer/admin |
| POST   | /sections/{id}/content                     | lecturer/admin |
| GET    | /courses/{id}/content                      | Public         |

### Assignments
| Method | Path                                       | Access         |
|--------|--------------------------------------------|----------------|
| POST   | /courses/{id}/assignments                  | lecturer/admin |
| GET    | /courses/{id}/assignments                  | Public         |
| POST   | /assignments/{id}/submit                   | student        |
| GET    | /assignments/{id}/submissions              | lecturer/admin |
| POST   | /submissions/{id}/grade                    | lecturer/admin |
| GET    | /students/{id}/average                     | Public         |

### Reports (views)
| Method | Path                                              |
|--------|---------------------------------------------------|
| GET    | /reports/courses/50-plus-students                 |
| GET    | /reports/students/5-plus-courses                  |
| GET    | /reports/lecturers/3-plus-courses                 |
| GET    | /reports/courses/top-10-enrolled                  |
| GET    | /reports/students/top-10-averages                 |

---

## Deployment — Railway

1. Push this repo to GitHub.
2. On Railway: `New Project > Deploy from GitHub > select the repo`.
3. Add a **PostgreSQL plugin**; Railway auto-injects `DATABASE_URL`.
4. Set the service's **Root Directory** to `backend/`.
5. Environment variables:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (copy from the Postgres plugin)
   - `JWT_SECRET` (generate a long random string)
6. Railway detects the `Procfile` and runs `gunicorn wsgi:app`.
7. After deploy, load the schema + seed from a local machine pointing `psql` at the Railway DB URL.

Public URL example: `https://spark-api.up.railway.app`

---

## Bonus-Points Checklist

- [x] **JWT Auth** — `auth.py` issues signed tokens, `auth_required` + `role_required` enforce
- [x] **Indexes** — 16 indexes on all FK columns + common query paths
- [x] **Query Optimization** — Views compile the 5 report queries; joins use indexed FKs
- [ ] Frontend (React/Vite) — Phase 2
- [ ] Public deployment — Phase 3
- [ ] Dockerfile — Phase 3
- [ ] CI/CD (GitHub Actions) — Phase 3
- [ ] Redis cache — optional

---

## Notes

- **Seed passwords are placeholders.** `generate_seed.py` writes deterministic fake bcrypt-shaped strings for the 100K+ seeded users so volume generation stays fast. These users cannot log in. For demo, create a real user via `POST /register` (which uses real bcrypt).
- **No ORM.** All database access goes through raw parameterized SQL in `app/db.py`, per spec.
- **Postgres-specific.** Uses `SERIAL`, `RETURNING`, and `CREATE TYPE ... AS ENUM`. If porting to MySQL, switch these to `AUTO_INCREMENT`, `LAST_INSERT_ID()`, and `VARCHAR CHECK` constraints respectively.
