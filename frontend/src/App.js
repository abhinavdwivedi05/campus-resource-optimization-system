import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import GuardDashboard from "./pages/GuardDashboard";
import Complaints from "./pages/Complaints";
import CreateComplaint from "./pages/CreateComplaint";
import Timetable from "./pages/Timetable";
import TimetableConflicts from "./pages/TimetableConflicts";
import Analytics from "./pages/Analytics";

import DashboardLayout from "./layout/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>

        {/* Auth pages (no sidebar/navbar) */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Dashboard layout routes — protected by role */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout>
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout>
                <StudentDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/faculty-dashboard"
          element={
            <ProtectedRoute allowedRoles={["faculty"]}>
              <DashboardLayout>
                <FacultyDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/guard-dashboard"
          element={
            <ProtectedRoute allowedRoles={["guard"]}>
              <DashboardLayout>
                <GuardDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Complaints />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-complaint"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CreateComplaint />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/timetable"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Timetable />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/timetable-conflicts"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TimetableConflicts />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout>
                <Analytics />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

      </Routes>
    </Router>
  );
}

export default App;