import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { isAuthenticated } from "../utils/auth";
const isTokenValid = () => {
  const token = localStorage.getItem("token");

  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    const now = Date.now();

    if (decoded.exp * 1000 < now) {
      // Token expired
      localStorage.removeItem("token");
      localStorage.removeItem("staff");
      localStorage.removeItem("tokenExpiry");
      return false;
    }

    return true;
  } catch (error) {
    // Invalid token
    localStorage.removeItem("token");
    localStorage.removeItem("staff");
    localStorage.removeItem("tokenExpiry");
    return false;
  }
};

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
