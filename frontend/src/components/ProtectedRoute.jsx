
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../api/axios.js";

function ProtectedRoute(props) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (props.adminOnly && user.role !== "admin") {
    return <Navigate to="/" />;
  }


  return props.children;
}

export default ProtectedRoute;
