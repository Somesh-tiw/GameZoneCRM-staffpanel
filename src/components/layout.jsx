import React, { useState, useEffect } from "react";
import Header from "./header";
import Sidebar from "./Sidebar";

const colors = {
  background: '#0F0E17',
  mainBackground: '#1A1A2E',
  textPrimary: '#00FFAB',
  danger: '#FF005C',
  success: '#00FF9F',
};

const Layout = ({ children }) => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(rgba(15,14,23,0.9), rgba(15,14,23,0.9)), url('/images/bg-cyberpunk.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: colors.textPrimary,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: isMobile ? 'flex-end' : 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          backgroundColor: '#161B22',
          borderBottom: '1px solid #222',
          position: 'sticky',
          top: 0,
          zIndex: 999,
        }}
      >
        {!isMobile && (
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.textPrimary }}>
            GameZone
          </div>
        )}

        {isMobile && (
          <button
            onClick={toggleMobileMenu}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textPrimary,
              fontSize: '28px',
              cursor: 'pointer',
            }}
          >
            ☰
          </button>
        )}
      </div>

      {/* Mobile Menu - Centered Content */}
      {isMobile && isMobileMenuOpen && (
        <div
          style={{
            backgroundColor: colors.mainBackground,
            height: 'calc(100vh - 60px)', // Adjust height under header
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
            color: '#fff',
            padding: '20px',
          }}
        >
          <a href="/create-order" style={menuLinkStyle}>Create Order</a>
          <a href="/orders" style={menuLinkStyle}>View Orders</a>
          <a href="/ledger" style={menuLinkStyle}>Ledgers</a>
        </div>
      )}

      {/* Desktop Layout */}
      {!isMobile && (
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <main
            style={{
              marginLeft: '220px',
              flexGrow: 1,
              backgroundColor: colors.mainBackground,
              color: '#fff',
              padding: '20px',
              boxSizing: 'border-box',
              minHeight: '100vh',
              overflowY: 'auto',
            }}
          >
            {children}
          </main>
        </div>
      )}

      {/* Mobile Content (Only when menu is closed) */}
      {isMobile && !isMobileMenuOpen && (
        <main
          style={{
            backgroundColor: colors.mainBackground,
            color: '#fff',
            padding: '20px',
            boxSizing: 'border-box',
            minHeight: '100vh',
          }}
        >
          {children}
        </main>
      )}
    </div>
  );
};

const menuLinkStyle = {
  textDecoration: 'none',
  color: '#FFD700',
  fontSize: '20px',
  fontWeight: 'bold',
  padding: '10px 0',
  borderBottom: '1px solid #333',
};

export default Layout;
