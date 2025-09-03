import React, { useState } from "react";
import { jwtDecode } from "jwt-decode";
import { logout } from "./utils/auth";
import { setAutoLogout } from "./utils/auth";

const Login = () => {
  const [formData, setFormData] = useState({
    phoneNumber: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("staff", JSON.stringify(data.staff));

        setAutoLogout(data.token); // <-- Add this

        setSuccess("Login successful!");
        setTimeout(() => {
          window.location.href = "/orders";
        }, 600);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-center">
        <div className="login-card">
          <div className="card-body">
            <h2 className="login-title">Login</h2>

            {error && <div className="alert-message error">{error}</div>}
            {success && <div className="alert-message success">{success}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="phoneNumber" className="form-label">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your phone number"
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        :root {
          --primary-bg: #0f172a;
          --card-bg: #1e293b;
          --accent-color: #22c55e;
          --input-bg: #334155;
          --text-light: #f8fafc;
          --text-muted: #94a3b8;
          --error-color: #ef4444;
          --success-color: #22c55e;
          --transition: all 0.3s ease;
        }

        .login-bg {
          min-height: 100vh;
          width: 100vw;
          background: var(--primary-bg);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-center {
          width: 100vw;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background-color: var(--card-bg);
          border-radius: 1rem;
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.25);
          transition: var(--transition);
          animation: fadeInUp 0.5s ease-out;
          margin: auto;
          padding: 0.5rem;
          box-sizing: border-box;
        }
        .login-card:hover {
          transform: translateY(-5px) scale(1.01);
        }

        .card-body {
          padding: 2rem 1.5rem 1.5rem 1.5rem;
        }

        .login-title {
          color: var(--accent-color);
          text-align: center;
          margin-bottom: 2rem;
          font-weight: 700;
          font-size: 2rem;
          letter-spacing: 1px;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          color: var(--text-light);
          font-size: 0.95rem;
          margin-bottom: 0.5rem;
          display: block;
          font-weight: 500;
        }

        .form-input {
          width: 100%;
          padding: 0.85rem 1rem;
          background-color: var(--input-bg);
          border: 1px solid transparent;
          border-radius: 0.5rem;
          color: var(--text-light);
          font-size: 1.05rem;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
        }

        .form-input::placeholder {
          color: var(--text-muted);
        }

        .submit-btn {
          width: 100%;
          padding: 0.85rem;
          background-color: var(--accent-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1.1rem;
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .submit-btn:hover:not(:disabled) {
          background-color: #16a34a;
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }

        .alert-message {
          padding: 0.75rem 1rem;
          margin-bottom: 1.5rem;
          border-radius: 0.5rem;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .error {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--error-color);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .success {
          background-color: rgba(34, 197, 94, 0.1);
          color: var(--success-color);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 480px) {
          .card-body {
            padding: 1rem;
          }
          .login-card {
            margin: 0 0.5rem;
            padding: 0.5rem;
          }
          .login-title {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
