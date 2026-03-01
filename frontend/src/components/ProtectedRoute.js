import { Navigate, useLocation } from "react-router-dom";
import { getStoredUser } from "../services/userService";

const ROLE_PATHS = {
  admin: "/admin-dashboard",
  student: "/student-dashboard",
  faculty: "/faculty-dashboard",
  guard: "/guard-dashboard",
};

/**
 * Protects dashboard routes: requires a stored role and redirects to the
 * correct role dashboard when accessing a role-specific path.
 */
function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const user = getStoredUser();
  const path = location.pathname;

  if (!user?.role) {
    return <Navigate to="/" replace />;
  }

  const role = user.role;

  // If this route is role-specific, ensure the user's role matches
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const redirectTo = ROLE_PATHS[role] || "/admin-dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

export default ProtectedRoute;
