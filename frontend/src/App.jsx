import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'

import Login         from './pages/auth/Login'
import Register      from './pages/auth/Register'
import Unauthorized  from './pages/auth/Unauthorized'

import AdminOverview from './pages/admin/AdminOverview'
import AdminCourses  from './pages/admin/AdminCourses'
import AdminReports  from './pages/admin/AdminReports'

import LecturerOverview    from './pages/lecturer/LecturerOverview'
import LecturerCourse      from './pages/lecturer/LecturerCourse'
import LecturerAssignments from './pages/lecturer/LecturerAssignments'
import LecturerGrading     from './pages/lecturer/LecturerGrading'

import StudentOverview  from './pages/student/StudentOverview'
import StudentCourse    from './pages/student/StudentCourse'
import StudentCalendar  from './pages/student/StudentCalendar'
import StudentCatalog   from './pages/student/StudentCatalog'

// ---------- Per-role navigation config ----------
const ADMIN_NAV = [
  { n: '01', label: 'Overview', to: '/admin/overview', end: true },
  { n: '02', label: 'Courses',  to: '/admin/courses' },
  { n: '03', label: 'Reports',  to: '/admin/reports' },
]
const LECTURER_NAV = [
  { n: '01', label: 'Overview',    to: '/lecturer/overview', end: true },
  { n: '02', label: 'My courses',  to: '/lecturer/courses' },
  { n: '03', label: 'Assignments', to: '/lecturer/assignments' },
  { n: '04', label: 'Grading',     to: '/lecturer/grading' },
]
const STUDENT_NAV = [
  { n: '01', label: 'Overview', to: '/student/overview', end: true },
  { n: '02', label: 'Catalog',  to: '/student/catalog' },
  { n: '03', label: 'Calendar', to: '/student/calendar' },
]

// Redirect "/" to the right dashboard based on role
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  const dest = {
    admin:    '/admin/overview',
    lecturer: '/lecturer/overview',
    student:  '/student/overview'
  }[user.role] || '/login'
  return <Navigate to={dest} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"         element={<Login />} />
          <Route path="/register"      element={<Register />} />
          <Route path="/unauthorized"  element={<Unauthorized />} />
          <Route path="/"              element={<RootRedirect />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell role="admin" nav={ADMIN_NAV} />
              </ProtectedRoute>
            }
          >
            <Route index              element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview"    element={<AdminOverview />} />
            <Route path="courses"     element={<AdminCourses />} />
            <Route path="reports"     element={<AdminReports />} />
          </Route>

          {/* Lecturer */}
          <Route
            path="/lecturer"
            element={
              <ProtectedRoute allowedRoles={['lecturer']}>
                <AppShell role="lecturer" nav={LECTURER_NAV} />
              </ProtectedRoute>
            }
          >
            <Route index                     element={<Navigate to="/lecturer/overview" replace />} />
            <Route path="overview"           element={<LecturerOverview />} />
            <Route path="courses"            element={<LecturerOverview />} />
            <Route path="courses/:courseId"  element={<LecturerCourse />} />
            <Route path="assignments"        element={<LecturerAssignments />} />
            <Route path="grading"            element={<LecturerGrading />} />
          </Route>

          {/* Student */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AppShell role="student" nav={STUDENT_NAV} />
              </ProtectedRoute>
            }
          >
            <Route index                     element={<Navigate to="/student/overview" replace />} />
            <Route path="overview"           element={<StudentOverview />} />
            <Route path="catalog"            element={<StudentCatalog />} />
            <Route path="courses/:courseId"  element={<StudentCourse />} />
            <Route path="calendar"           element={<StudentCalendar />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
