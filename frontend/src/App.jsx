import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";
import CitizenDashboard from "./pages/citizen/CitizenDashboard";
import CreateComplaint from "./pages/citizen/complaints/CreateComplaint";
import WorkerDashboard from "./pages/worker/WorkerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

function getAuth() {
  const token = localStorage.getItem("access_token");
  const userStr = localStorage.getItem("user");
  if (!token || !userStr) return null;
  try {
    const user = JSON.parse(userStr);
    return { token, user };
  } catch {
    return null;
  }
}

function getRoleHome(role) {
  const normalized = (role || "").toLowerCase().trim();
  if (normalized === "citizen") return "/citizen/dashboard";
  if (normalized === "worker") return "/worker/dashboard";
  if (normalized === "admin") return "/admin/dashboard";
  return "/login";
}

function ProtectedRoute({ allowedRoles, children }) {
  const auth = getAuth();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (auth.user?.role || "").toLowerCase().trim();

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={getRoleHome(userRole)} replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Authentication */}
        <Route path="/login" element={<Login />} />

        {/* Citizen Routes */}
        <Route
          path="/citizen/dashboard"
          element={
            <ProtectedRoute allowedRoles={["citizen"]}>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/complaints/new"
          element={
            <ProtectedRoute allowedRoles={["citizen"]}>
              <CreateComplaint />
            </ProtectedRoute>
          }
        />

        {/* Worker Routes */}
        <Route
          path="/worker/dashboard"
          element={
            <ProtectedRoute allowedRoles={["worker"]}>
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Default / Fallback */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;