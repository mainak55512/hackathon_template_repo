import React, { useState } from 'react';
import api from '../services/api';

const LoginPage = ({ onLoginSuccess }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const data = await api.login(creds.username, creds.password);
    setIsLoading(false);

    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      onLoginSuccess(data.user);
    } else {
      setError(data.error || 'Invalid username or password');
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap');

        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #0d0d0d;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          padding: 1.5rem;
          font-family: 'IBM Plex Sans', sans-serif;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: #111111;
          border: 1px solid #2a2a2a;
          border-top: 2px solid #d97706;
          position: relative;
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 0;
          width: 60px;
          height: 2px;
          background: #fbbf24;
        }

        .login-header {
          padding: 2rem 2.5rem 1.5rem;
          border-bottom: 1px solid #1e1e1e;
        }

        .login-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(217, 119, 6, 0.1);
          border: 1px solid rgba(217, 119, 6, 0.3);
          padding: 4px 10px;
          margin-bottom: 1.25rem;
        }

        .login-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #d97706;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .login-badge-text {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: #d97706;
          text-transform: uppercase;
        }

        .login-title {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.375rem;
          font-weight: 600;
          color: #f5f5f5;
          letter-spacing: -0.01em;
          margin: 0 0 4px;
        }

        .login-subtitle {
          font-size: 13px;
          color: #5a5a5a;
          font-weight: 300;
          letter-spacing: 0.01em;
          margin: 0;
        }

        .login-body {
          padding: 2rem 2.5rem 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #4a4a4a;
          font-weight: 500;
        }

        .field-input {
          width: 100%;
          box-sizing: border-box;
          background: #0a0a0a;
          border: 1px solid #222222;
          border-left: 2px solid #2a2a2a;
          color: #e5e5e5;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          padding: 10px 14px;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
          -webkit-appearance: none;
          letter-spacing: 0.02em;
        }

        .field-input::placeholder {
          color: #2e2e2e;
        }

        .field-input:focus {
          border-color: #3a3a3a;
          border-left-color: #d97706;
          background: #0c0c0c;
        }

        .error-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(127, 29, 29, 0.15);
          border: 1px solid rgba(220, 38, 38, 0.25);
          border-left: 2px solid #dc2626;
          padding: 10px 14px;
        }

        .error-icon {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: #dc2626;
          font-weight: 600;
          flex-shrink: 0;
          padding-top: 1px;
        }

        .error-text {
          font-size: 12px;
          color: #f87171;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 0.01em;
          line-height: 1.5;
        }

        .submit-btn {
          width: 100%;
          box-sizing: border-box;
          background: #d97706;
          border: none;
          color: #0d0d0d;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 13px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.15s ease, transform 0.1s ease;
          margin-top: 0.25rem;
          position: relative;
          overflow: hidden;
        }

        .submit-btn::after {
          content: '';
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 1px;
          background: rgba(0,0,0,0.35);
          transition: width 0.15s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: #b45309;
        }

        .submit-btn:hover:not(:disabled)::after {
          width: 26px;
        }

        .submit-btn:active:not(:disabled) {
          transform: scale(0.99);
        }

        .submit-btn:disabled {
          background: #292929;
          color: #4a4a4a;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 1.5px solid #4a4a4a;
          border-top-color: #d97706;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          padding: 0 2.5rem 1.75rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .footer-line {
          flex: 1;
          height: 1px;
          background: #1a1a1a;
        }

        .footer-text {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: #2e2e2e;
          letter-spacing: 0.06em;
        }

        .corner-mark {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 14px;
          height: 14px;
          border-top: 1px solid #2a2a2a;
          border-left: 1px solid #2a2a2a;
        }
      `}</style>

      <div className="login-root">
        <div className="login-card">

          <div className="login-header">
            <div className="login-badge">
              <span className="login-badge-dot" />
              <span className="login-badge-text">Secure Access</span>
            </div>
            <h1 className="login-title">System Login</h1>
            <p className="login-subtitle">Authorized personnel only</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-body">

              <div className="field-group">
                <label className="field-label">Username</label>
                <input
                  type="text"
                  required
                  className="field-input"
                  placeholder="enter username"
                  onChange={e => setCreds({ ...creds, username: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Password</label>
                <input
                  type="password"
                  required
                  className="field-input"
                  placeholder="••••••••"
                  onChange={e => setCreds({ ...creds, password: e.target.value })}
                />
              </div>

              {error && (
                <div className="error-box">
                  <span className="error-icon">!</span>
                  <span className="error-text">{error}</span>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="submit-btn">
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    <span>Authenticating</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

            </div>
          </form>

          <div className="login-footer">
            <div className="footer-line" />
            <span className="footer-text">encrypted · 256-bit</span>
            <div className="footer-line" />
          </div>

          <div className="corner-mark" />
        </div>
      </div>
    </>
  );
};

export default LoginPage;
