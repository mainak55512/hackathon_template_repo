import React, { useState, useEffect } from 'react';
import api from './services/api';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Check if token exists on load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
        api.request('/auth/me')
           .then(u => { if(u.username) setUser(u); })
           .finally(() => setInitialized(true));
    } else {
        setInitialized(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  // Secure boot / system loading view
  if (!initialized) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .init-root {
          min-height: 100vh;
          background-color: #0d0d0d;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          font-family: 'IBM Plex Mono', monospace;
          color: #d97706;
          font-size: 13px;
        }
        .init-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #222222;
          border-top-color: #d97706;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="init-root">
        <div className="init-spinner" />
        <span>BOOTING_SYSTEM_SHELL_V1.0.4...</span>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        .app-root {
          background-color: #0d0d0d;
          min-height: 100vh;
          font-family: 'IBM Plex Sans', sans-serif;
          color: #e5e5e5;
        }

        /* Nav Layout */
        .app-nav {
          background: #111111;
          border-bottom: 1px solid #1e1e1e;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
        }

        /* Branding */
        .nav-logo-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-logo-icon {
          height: 28px;
          width: 28px;
          background: #d97706;
          color: #0d0d0d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          font-size: 16px;
        }

        .nav-logo-text {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.15rem;
          font-weight: 600;
          color: #f5f5f5;
          letter-spacing: -0.02em;
        }

        .nav-logo-text-alt {
          color: #d97706;
          font-weight: 400;
        }

        /* Action bar & Badges */
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .user-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0a0a0a;
          border: 1px solid #222222;
          border-left: 2px solid #d97706;
          padding: 6px 14px;
        }

        .user-avatar {
          height: 20px;
          width: 20px;
          background: rgba(217, 119, 6, 0.1);
          border: 1px solid rgba(217, 119, 6, 0.3);
          color: #d97706;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          font-size: 11px;
        }

        .user-name {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          color: #e5e5e5;
        }

        .badge-divider {
          color: #2a2a2a;
          font-size: 12px;
        }

        .user-role {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: #d97706;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Logout Action */
        .btn-logout {
          background: transparent;
          border: 1px solid #222222;
          color: #8a8a8a;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          padding: 6px 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-logout:hover {
          border-color: rgba(220, 38, 38, 0.4);
          background: rgba(220, 38, 38, 0.05);
          color: #f87171;
        }

        /* Layout Main wrapper */
        .app-main {
          flex-grow: 1;
          width: 100%;
          box-sizing: border-box;
        }

        /* Layout Footer */
        .app-footer {
          background: #111111;
          border-top: 1px solid #1e1e1e;
          padding: 1.5rem 2rem;
          text-align: center;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: #4a4a4a;
          letter-spacing: 0.05em;
        }
      `}</style>

      <div className="app-root">
        {!user ? (
          <LoginPage onLoginSuccess={(u) => setUser(u)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            
            {/* Top Nav */}
            <nav className="app-nav">
              <div className="nav-container">
                <div className="nav-logo-group">
                  <div className="nav-logo-icon">S</div>
                  <span className="nav-logo-text">System<span className="nav-logo-text-alt">Manager</span></span>
                </div>
                
                <div className="nav-actions">
                  <div className="user-badge">
                    <span className="user-avatar">
                      {user.username?.[0].toUpperCase()}
                    </span>
                    <span className="user-name">{user.username}</span>
                    <span className="badge-divider">|</span>
                    <span className="user-role">{user.roles?.[0] || 'User'}</span>
                  </div>
                  <button onClick={handleLogout} className="btn-logout">
                    Logout
                  </button>
                </div>
              </div>
            </nav>
            
            {/* Page Content */}
            <main className="app-main">
              <AdminDashboard />
            </main>

            {/* Footer */}
            <footer className="app-footer">
              © 2026 SYSTEM_MANAGER_CORP. ALL PRIVILEGES SECURED.
            </footer>

          </div>
        )}
      </div>
    </>
  );
}

export default App;
