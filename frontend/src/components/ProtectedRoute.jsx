// Wrap a page in <ProtectedRoute> so only logged-in users can see it.
// Add "adminOnly" to allow only admins: <ProtectedRoute adminOnly>

import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../api/axios.js";

function ProtectedRoute(props) {
  const user = getCurrentUser();

  // Not logged in: send them to the login page
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Page is for admins only, but this user is not an admin: send them home
  if (props.adminOnly && user.role !== "admin") {
    return <Navigate to="/" />;
  }

  // Allowed: show the page
  return props.children;
}

export default ProtectedRoute;
