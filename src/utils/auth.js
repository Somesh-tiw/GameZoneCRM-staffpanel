// utils/auth.js
import { jwtDecode } from "jwt-decode";

// Get token from localStorage
export const getToken = () => localStorage.getItem("token");

// Check if token is expired
export const isTokenExpired = (token) => {
  try {
    const { exp } = jwtDecode(token);
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
};

// Logout function
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("staff");
  localStorage.removeItem("tokenExpiry");
  window.location.href = "/";
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getToken();
  return token && !isTokenExpired(token);
};

// ⏰ Set auto logout timer
export const setAutoLogout = (token) => {
  try {
    const { exp } = jwtDecode(token);
    const timeRemaining = exp * 1000 - Date.now();

    if (timeRemaining > 0) {
      setTimeout(() => {
        alert("Session expired. Logging out.");
        logout();
      }, timeRemaining);
    } else {
      logout(); // If already expired
    }
  } catch {
    logout();
  }
};
