/**
 * Spark API client
 * --------------------------------------------------------------------------
 * Spark has two backends in flight:
 *   - Phase 1 (Postgres, this repo's /backend)        — "spark" flavor
 *   - Teammate's MySQL Flask API (api.py)             — "mysql" flavor
 *
 * They use different route shapes. This module exposes ONE unified
 * interface and picks the right route per backend.
 *
 * Set VITE_API_FLAVOR=mysql in .env to target the MySQL backend.
 * Default is "spark".
 */

const API_URL    = import.meta.env.VITE_API_URL    || 'http://localhost:5000'
const API_FLAVOR = import.meta.env.VITE_API_FLAVOR || 'spark'    // 'spark' | 'mysql'

const TOKEN_KEY = 'spark.token'
const USER_KEY  = 'spark.user'

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
export const token = {
  get:    ()      => localStorage.getItem(TOKEN_KEY),
  set:    (t)     => localStorage.setItem(TOKEN_KEY, t),
  clear:  ()      => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) }
}

export const storedUser = {
  get: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') }
    catch { return null }
  },
  set: (u) => localStorage.setItem(USER_KEY, JSON.stringify(u))
}

// ---------------------------------------------------------------------------
// Core request wrapper
// ---------------------------------------------------------------------------
async function request(path, { method = 'GET', body, auth = false, query } = {}) {
  const url = new URL(`${API_URL}${path}`)
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }

  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const t = token.get()
    if (t) headers['Authorization'] = `Bearer ${t}`
  }

  let res
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
  } catch (netErr) {
    throw new Error(`Network error reaching API — is ${API_URL} running?`)
  }

  const ct = res.headers.get('content-type') || ''
  const payload = ct.includes('application/json') ? await res.json() : await res.text()

  if (!res.ok) {
    const msg = (payload && payload.error) || (typeof payload === 'string' ? payload : `Request failed (${res.status})`)
    throw new Error(msg)
  }
  return payload
}

// ---------------------------------------------------------------------------
// Route table — one place for flavor differences
// ---------------------------------------------------------------------------
const ROUTES = {
  spark: {
    register:         '/register',
    login:            '/login',
    courses:          '/courses',
    createCourse:     '/courses',
    studentCourses:   (id) => `/students/${id}/courses`,
    lecturerCourses:  (id) => `/lecturers/${id}/courses`,
    registerForCourse:(id) => `/courses/${id}/register`,
    courseMembers:    (id) => `/courses/${id}/members`,
    // reports
    report50:         '/reports/courses/50-plus-students',
    report5:          '/reports/students/5-plus-courses',
    report3:          '/reports/lecturers/3-plus-courses',
    reportTop10C:     '/reports/courses/top-10-enrolled',
    reportTop10S:     '/reports/students/top-10-averages',
    // events
    courseEvents:     (id) => `/courses/${id}/events`,
    studentEvents:    (id) => `/students/${id}/events`,
    // forums
    courseForums:     (id) => `/courses/${id}/forums`,
    forumThreads:     (id) => `/forums/${id}/threads`,
    threadPosts:      (id) => `/threads/${id}/posts`,
    // content
    courseSections:   (id) => `/courses/${id}/sections`,
    sectionContent:   (id) => `/sections/${id}/content`,
    courseContent:    (id) => `/courses/${id}/content`,
    // assignments
    courseAssignments:(id) => `/courses/${id}/assignments`,
    submit:           (id) => `/assignments/${id}/submit`,
    submissions:      (id) => `/assignments/${id}/submissions`,
    gradeSubmission:  (id) => `/submissions/${id}/grade`,
    studentAverage:   (id) => `/students/${id}/average`,
  },
  mysql: {
    register:         '/user/register',
    login:            '/user/login',
    courses:          '/courses',
    createCourse:     '/course/create',
    studentCourses:   (id) => `/courses/student/${id}`,
    lecturerCourses:  (id) => `/courses/lecturer/${id}`,
    registerForCourse:(id) => `/course/register`,   // MySQL takes IDs in body
    courseMembers:    (id) => `/course/${id}/members`,
    // The MySQL flavor hasn't implemented these yet; we fall back gracefully
    report50:         '/reports/courses/50-plus-students',
    report5:          '/reports/students/5-plus-courses',
    report3:          '/reports/lecturers/3-plus-courses',
    reportTop10C:     '/reports/courses/top-10-enrolled',
    reportTop10S:     '/reports/students/top-10-averages',
    courseEvents:     (id) => `/courses/${id}/events`,
    studentEvents:    (id) => `/students/${id}/events`,
    courseForums:     (id) => `/courses/${id}/forums`,
    forumThreads:     (id) => `/forums/${id}/threads`,
    threadPosts:      (id) => `/threads/${id}/posts`,
    courseSections:   (id) => `/courses/${id}/sections`,
    sectionContent:   (id) => `/sections/${id}/content`,
    courseContent:    (id) => `/courses/${id}/content`,
    courseAssignments:(id) => `/courses/${id}/assignments`,
    submit:           (id) => `/assignments/${id}/submit`,
    submissions:      (id) => `/assignments/${id}/submissions`,
    gradeSubmission:  (id) => `/submissions/${id}/grade`,
    studentAverage:   (id) => `/students/${id}/average`,
  }
}

const R = ROUTES[API_FLAVOR] || ROUTES.spark

// ---------------------------------------------------------------------------
// Unified API surface
// ---------------------------------------------------------------------------
export const api = {
  flavor: API_FLAVOR,
  url:    API_URL,

  // ---- Auth ----
  async register(user) {
    return request(R.register, { method: 'POST', body: user })
  },
  async login(credentials) {
    // Phase 1 accepts {username, password}; MySQL accepts {user_id, password}.
    // We send what the caller provides; each Login screen is tuned to its flavor.
    const payload = await request(R.login, { method: 'POST', body: credentials })
    if (payload.token) {
      token.set(payload.token)
      const u = { user_id: payload.user_id, role: payload.role }
      storedUser.set(u)
    }
    return payload
  },
  logout() { token.clear() },

  // ---- Courses ----
  courses:           ()        => request(R.courses),
  createCourse:      (c)       => request(R.createCourse, { method: 'POST', body: c, auth: true }),
  studentCourses:    (id)      => request(R.studentCourses(id)),
  lecturerCourses:   (id)      => request(R.lecturerCourses(id)),
  courseMembers:     (id)      => request(R.courseMembers(id)),

  async registerForCourse(courseId, studentId) {
    // Route signatures differ: Spark takes {} + JWT identifies student;
    // MySQL takes IDs in the body.
    if (API_FLAVOR === 'mysql') {
      return request(R.registerForCourse(courseId), {
        method: 'POST',
        body: { student_id: studentId, course_id: courseId }
      })
    }
    return request(R.registerForCourse(courseId), { method: 'POST', auth: true })
  },

  // ---- Calendar ----
  courseEvents:     (id)            => request(R.courseEvents(id)),
  studentEvents:    (id, date)      => request(R.studentEvents(id), { query: { date } }),
  createEvent:      (id, body)      => request(R.courseEvents(id), { method: 'POST', body, auth: true }),

  // ---- Forums ----
  courseForums:     (id)            => request(R.courseForums(id)),
  createForum:      (id, body)      => request(R.courseForums(id), { method: 'POST', body, auth: true }),
  forumThreads:     (id)            => request(R.forumThreads(id)),
  createThread:     (id, body)      => request(R.forumThreads(id), { method: 'POST', body, auth: true }),
  threadPosts:      (id)            => request(R.threadPosts(id)),
  createPost:       (id, body)      => request(R.threadPosts(id), { method: 'POST', body, auth: true }),

  // ---- Content ----
  courseContent:    (id)            => request(R.courseContent(id)),
  courseSections:   (id)            => request(R.courseSections(id)),
  createSection:    (id, body)      => request(R.courseSections(id), { method: 'POST', body, auth: true }),
  addContent:       (secId, body)   => request(R.sectionContent(secId), { method: 'POST', body, auth: true }),

  // ---- Assignments ----
  courseAssignments:(id)            => request(R.courseAssignments(id)),
  createAssignment: (id, body)      => request(R.courseAssignments(id), { method: 'POST', body, auth: true }),
  submit:           (id, body)      => request(R.submit(id), { method: 'POST', body, auth: true }),
  submissions:      (id)            => request(R.submissions(id), { auth: true }),
  grade:            (id, body)      => request(R.gradeSubmission(id), { method: 'POST', body, auth: true }),
  studentAverage:   (id)            => request(R.studentAverage(id)),

  // ---- Reports ----
  report50:          () => request(R.report50),
  report5:           () => request(R.report5),
  report3:           () => request(R.report3),
  reportTop10Courses:() => request(R.reportTop10C),
  reportTop10Students:() => request(R.reportTop10S),
}

export default api
