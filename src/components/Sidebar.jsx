import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: "➕", label: "Create Orders", href: "/create-order" },
    { icon: "👁️", label: "View Orders", href: "/orders" },
    { icon: "📖", label: "Add Ledger", href: "/ledger" },
    { icon: "👤", label: "Customer", href: "/customers" },
    { icon: "📊", label: "View Ledger", href: "/view-ledger" },
  ];

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    const token = localStorage.getItem("token");

    try {
      if (token) {
        await fetch("http://localhost:5000/api/customers/log-activity-save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "logout",
            details: {},
          }),
        });
      }
    } catch (err) {
      console.error("Logout activity logging failed:", err);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("staff");
    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h5 className="logo-text">Gamer Squad</h5>
          </div>

          <div className="sidebar-divider" />

          <nav className="sidebar-nav">
            {menuItems.map((item, idx) => (
              <Link key={idx} to={item.href} className="nav-item">
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}

            <button onClick={handleLogout} className="nav-item logout-btn">
              <span className="nav-icon">🚪</span>
              <span className="nav-label">Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      <style>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100%;
          width: 220px;
          background-color: #1e293b;
          border-right: 1px solid #334155;
          display: flex;
          flex-direction: column;
          z-index: 1000;
        }

        .sidebar-content {
          padding: 1rem;
        }

        .sidebar-header {
          margin-bottom: 2rem;
        }

        .sidebar-divider {
          height: 1px;
          background-color: #334155;
          margin-bottom: 1.5rem;
          width: 100%;
        }

        .logo-text {
          color: #22c55e;
          font-weight: bold;
          font-size: 1.8rem;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          text-decoration: none;
          padding: 0.5rem;
          border-radius: 5px;
          transition: background 0.3s;
          cursor: pointer;
        }

        .nav-item:hover {
          background-color: #334155;
          color: #22c55e;
        }

        .logout-btn {
          background: none;
          border: none;
          text-align: left;
        }

        .nav-icon {
          font-size: 1.1rem;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
