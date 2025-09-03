import React from 'react';

const Header = () => {
  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="header-left">
            <h4 className="logo-text">Gamer Squad</h4>
          </div>
        </div>
      </header>

      <style jsx>{`
        .header {
          position: fixed;
          padding: 0.75rem 1rem;
          background-color: #0f172a;
          border-bottom: 1px solid #334155;
          position: sticky;
          top: 0;
          z-index: 1030;
        }

        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-text {
          margin: 0;
          font-weight: 700;
          color: #22c55e;
        }
      `}</style>
    </>
  );
};

export default Header;
