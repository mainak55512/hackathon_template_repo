import React, { useEffect, useState } from 'react';
import api from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('stats'); // Default active section
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'Viewer', is_active: true });
  const [error, setError] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    setError(null);
  };


  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await api.createUser(formData);

      const newUser = response.data || response;
      if (newUser && (newUser.id || newUser.username)) {
        setUsers(prevUsers => [newUser, ...prevUsers]);

        if (stats) {
          setStats(prev => ({
            ...prev,
            total_users: (Number(prev.total_users) || 0) + 1,
            active_users: (Number(prev.active_users) || 0) + 1,
            admin_count: formData.role === 'Admin' ? (Number(prev.admin_count) || 0) + 1 : prev.admin_count
          }));
        }

        setFormData({ username: '', email: '', password: '', role: 'Viewer', is_active: true });
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error("Creation failed:", err);
      setError(err.response?.data?.error || "Connection refused by backend");
    }
  };

  const initiateEdit = (user) => {
    // Store the ID so we know we are EDITING, not CREATING
    setEditingUserId(user.id);

    // Fill the form with the user's current values from the table
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Keep empty unless the admin wants to reset it
      role: user.roles?.[0] || user.role || 'Viewer',
      is_active: user.is_active
    });

    setIsModalOpen(true);
  };


  const handleUpdateUser = async (id, updatedData) => {
    try {
      const response = await api.updateUser(id, updatedData);
      const updatedUser = response.data || response;

      if (updatedUser) {
        // Mirroring your handleDelete logic:
        // Instead of .filter(), we use .map() to replace the entry
        setUsers(prevUsers => prevUsers.map(u => u.id === id ? updatedUser : u));

        const statsData = await api.getStats();
        setStats(statsData);

        // Cleanup
        setIsModalOpen(false);
        setEditingUserId(null);
        setFormData({ username: '', email: '', password: '', role: 'Viewer', is_active: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Update protocol failed");
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [statsData, usersData] = await Promise.all([
          api.getStats(),
          api.getUsers()
        ]);
        setStats(statsData);
        setUsers(usersData);

        // Attempt to load live logs from API if method exists; otherwise, use the styled mock registry
        if (api.getLogs) {
          const logsData = await api.getLogs();
          setLogs(logsData);
        } else {
          setLogs(getMockLogs());
        }
      } catch (e) {
        console.error("Error loading dashboard", e);
        setLogs(getMockLogs());
      }
      setLoading(false);
    };
    loadDashboard();
  }, []);


  const handleDelete = async (id, username) => {
    if (window.confirm(`Are you sure you want to delete '${username}'?`)) {
      await api.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      setStats(prev => ({ ...prev, total_users: prev.total_users - 1 }));
    }
  };

  // Header configurations dynamic text depending on tab select
  const activeHeaderDetails = {
    stats: {
      title: "System Telemetry",
      subtitle: "Realtime core system activity & node metrics"
    },
    users: {
      title: "User Control Matrix",
      subtitle: "System privilege management and authentication records"
    },
    logs: {
      title: "Security Ledger",
      subtitle: "Secured audit trail of local kernel and login events"
    }
  };

  if (loading) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .loading-root {
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
        .dash-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #222222;
          border-top-color: #d97706;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="loading-root">
        <div className="dash-spinner" />
        <span>BOOTING DASHBOARD_V1.0.4...</span>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        .dash-root {
          min-height: 100vh;
          background-color: #0d0d0d;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          padding: 2.5rem 2rem;
          font-family: 'IBM Plex Sans', sans-serif;
          color: #e5e5e5;
          box-sizing: border-box;
        }

        .dash-wrapper {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Header Style */
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
          border-bottom: 1px solid #1e1e1e;
          padding-bottom: 1.5rem;
        }

        .dash-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dash-title {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.6rem;
          font-weight: 600;
          color: #f5f5f5;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .dash-subtitle {
          font-size: 12px;
          color: #5a5a5a;
          font-weight: 300;
          margin: 0;
        }

        .btn-primary {
          background: #d97706;
          border: none;
          color: #0d0d0d;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 10px 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s ease, transform 0.1s ease;
        }

        .btn-primary:hover {
          background: #b45309;
        }

        .btn-primary:active {
          transform: scale(0.98);
        }

        /* Sidebar & Layout Styles */
        .dash-layout {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
        }

        .sidebar {
  			width: 120px;          /* Reduced from 220px */
  			flex-shrink: 0;
  			display: flex;
  			flex-direction: column;
  			gap: 8px;
		}

        .sidebar-item {
          background: #111111;
          border: 1px solid #222222;
          border-left: 2px solid transparent;
          color: #8a8a8a;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sidebar-item:hover {
          border-color: #333333;
          color: #f5f5f5;
          background: rgba(255, 255, 255, 0.01);
        }

        .sidebar-item.active {
          border-color: #d97706;
          border-left: 2px solid #d97706;
          color: #f5f5f5;
          background: rgba(217, 119, 6, 0.04);
        }

        .dash-content {
          flex-grow: 1;
          min-width: 0; /* Keep tables responsive inside flexbox container */
        }

        /* Stats Cards styling */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }

        .stat-card {
          background: #111111;
          border: 1px solid #222222;
          border-left: 2px solid var(--accent-color, #d97706);
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: relative;
        }

        .stat-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 4px;
          background: var(--bg-accent, rgba(217, 119, 6, 0.05));
          border: 1px solid var(--border-accent, rgba(217, 119, 6, 0.15));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-color, #d97706);
        }

        .stat-card-icon svg {
          width: 20px;
          height: 20px;
          stroke-width: 1.75;
        }

        .stat-card-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-card-title {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #5a5a5a;
          margin: 0;
          font-weight: 500;
        }

        .stat-card-value {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--accent-color, #f5f5f5);
          margin: 0;
        }

        /* Tables container */
        .table-container {
          background: #111111;
          border: 1px solid #222222;
          position: relative;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .table-header {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #1e1e1e;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .table-title {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.1rem;
          font-weight: 600;
          color: #f5f5f5;
          margin: 0;
        }

        .table-subtitle {
          font-size: 12px;
          color: #5a5a5a;
          margin: 0;
          font-weight: 300;
        }

        .custom-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .custom-table th {
          background: #0a0a0a;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #4a4a4a;
          padding: 14px 2rem;
          border-bottom: 1px solid #1e1e1e;
          font-weight: 500;
        }

        .custom-table td {
          padding: 16px 2rem;
          border-bottom: 1px solid #1a1a1a;
          font-size: 13px;
          vertical-align: middle;
        }

        .custom-table tr:last-child td {
          border-bottom: none;
        }

        .custom-table tr:hover td {
          background: #141414;
        }

        /* Table cells customized styles */
        .username-cell {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 500;
          color: #e5e5e5;
        }

        .email-cell {
          color: #737373;
        }

        .role-badge {
          display: inline-flex;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 3px 8px;
          font-weight: 500;
        }

        .role-admin {
          background: rgba(217, 119, 6, 0.1);
          border: 1px solid rgba(217, 119, 6, 0.3);
          color: #d97706;
        }

        .role-user {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #8a8a8a;
        }

        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }

        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .status-active {
          color: #10b981;
        }

        .status-active .status-dot {
          background: #10b981;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
        }

        .status-inactive {
          color: #525252;
        }

        .status-inactive .status-dot {
          background: #525252;
        }

        /* Logs table styles */
        .timestamp-cell {
          font-family: 'IBM Plex Mono', monospace;
          color: #d97706;
          font-size: 12px;
        }

        .event-cell {
          color: #e5e5e5;
        }

        .operator-cell {
          font-family: 'IBM Plex Mono', monospace;
          color: #a3a3a3;
        }

        .ip-cell {
          font-family: 'IBM Plex Mono', monospace;
          color: #525252;
        }

        .status-failed {
          color: #ef4444;
        }

        .status-failed .status-dot {
          background: #ef4444;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
        }

        .status-warning {
          color: #f59e0b;
        }

        .status-warning .status-dot {
          background: #f59e0b;
          box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
        }

        .actions-cell {
          text-align: right;
        }

        .btn-action-edit {
          background: transparent;
          border: 1px solid #2a2a2a;
          color: #a3a3a3;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          padding: 5px 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-right: 6px;
        }

        .btn-action-edit:hover {
          border-color: #404040;
          color: #f5f5f5;
          background: rgba(255, 255, 255, 0.02);
        }

        .btn-action-delete {
          background: rgba(220, 38, 38, 0.05);
          border: 1px solid rgba(220, 38, 38, 0.2);
          color: #f87171;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          padding: 5px 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-action-delete:hover {
          background: rgba(220, 38, 38, 0.15);
          border-color: rgba(220, 38, 38, 0.45);
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

        /* Responsive Layout wrapping rules */
        @media (max-width: 768px) {
          .dash-layout {
            flex-direction: column;
            gap: 1.5rem;
          }
          .sidebar {
            width: 100%;
            flex-direction: row;
            overflow-x: auto;
          }
          .sidebar-item {
            flex: 1;
            justify-content: center;
            white-space: nowrap;
          }
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #111;
          border: 1px solid #222;
          width: 400px;
          padding: 2rem;
          position: relative;
          box-shadow: 0 0 30px rgba(0,0,0,0.5);
        }

        .form-group { margin-bottom: 1.2rem; }
        
        .form-label {
          display: block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: #5a5a5a;
          text-transform: uppercase;
          text-align: left;
          margin-bottom: 6px;
        }

        .form-input {
          width: 100%;
          background: #0a0a0a;
          border: 1px solid #222;
          color: #e5e5e5;
          padding: 10px;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #d97706;
        }

        .error-msg {
          color: #ef4444;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          margin-bottom: 1rem;
          text-transform: uppercase;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 1.5rem;
        }
      `}</style>

      <div className="dash-root">
        <div className="dash-wrapper">

          {/* Dynamic Header */}
          <div className="dash-header">
            <div className="dash-title-group">
              <h1 className="dash-title">{activeHeaderDetails[activeTab].title}</h1>
              <p className="dash-subtitle">{activeHeaderDetails[activeTab].subtitle}</p>
            </div>

            {/* Conditionally render actions depending on active view */}
            {activeTab === 'users' && (
              <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                Add User
              </button>
            )}
          </div>

          <div className="dash-layout">

            {/* Sidebar Navigation */}
            <aside className="sidebar">
              <button
                onClick={() => setActiveTab('stats')}
                className={`sidebar-item ${activeTab === 'stats' ? 'active' : ''}`}
              >
                <svg style={{ width: '15px', height: '15px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
                Stats
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`}
              >
                <svg style={{ width: '15px', height: '15px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13.732 4c-.77.923-1.168 2.088-1.168 3.387 0 1.299.398 2.464 1.168 3.387M19.914 21a6.994 6.994 0 00-2.433-4.382m-.032 0h1.59" />
                </svg>
                Users
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`sidebar-item ${activeTab === 'logs' ? 'active' : ''}`}
              >
                <svg style={{ width: '15px', height: '15px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Logs
              </button>
            </aside>

            {/* Core Content Area */}
            <div className="dash-content">

              {/* SECTION: STATS */}
              {activeTab === 'stats' && stats && (
                <div className="stats-grid">
                  <StatCard
                    title="Total Users"
                    value={stats.total_users}
                    icon="users"
                    color="#d97706"
                    bgAccent="rgba(217, 119, 6, 0.04)"
                    borderAccent="rgba(217, 119, 6, 0.15)"
                  />
                  <StatCard
                    title="Active Accounts"
                    value={stats.active_users}
                    icon="check"
                    color="#10b981"
                    bgAccent="rgba(16, 185, 129, 0.04)"
                    borderAccent="rgba(16, 185, 129, 0.15)"
                  />
                  <StatCard
                    title="Administrators"
                    value={stats.admin_count}
                    icon="shield"
                    color="#0ea5e9"
                    bgAccent="rgba(14, 165, 233, 0.04)"
                    borderAccent="rgba(14, 165, 233, 0.15)"
                  />
                  <StatCard
                    title="System Status"
                    value={users.length > 0 ? "ONLINE" : "OFFLINE"}
                    icon="log"
                    color="#a855f7"
                    bgAccent="rgba(168, 85, 247, 0.04)"
                    borderAccent="rgba(168, 85, 247, 0.15)"
                  />
                </div>
              )}

              {/* SECTION: USERS */}
              {activeTab === 'users' && (
                <div className="table-container">
                  <div className="table-header">
                    <h2 className="table-title">User Management Database</h2>
                    <p className="table-subtitle">System privilege registry registry_v1.0</p>
                  </div>

                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email Address</th>
                        <th>System Role</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td className="username-cell">{user?.username || 'N/A'}</td>
                          <td className="email-cell">{user.email}</td>
                          <td>
                            <span className={`role-badge ${(user.roles?.includes('Admin') || user.role === 'Admin') ? 'role-admin' : 'role-user'
                              }`}>
                              {user.roles?.[0] || user.role || 'User'}
                            </span>
                          </td>
                          <td>
                            {user.is_active ? (
                              <span className="status-indicator status-active">
                                <span className="status-dot" />
                                Active
                              </span>
                            ) : (
                              <span className="status-indicator status-inactive">
                                <span className="status-dot" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="actions-cell">
                            <button className="btn-action-edit" onClick={() => initiateEdit(user)}>Edit</button>
                            <button
                              onClick={() => handleDelete(user.id, user.username)}
                              className="btn-action-delete"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="corner-mark" />
                </div>
              )}

              {isModalOpen && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <h2 className="table-title">
                      {editingUserId ? `Edit User: ${formData.username}` : "Provision New Identity"}
                    </h2>
                    {error && <div className="error-msg">!! {error}</div>}

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (editingUserId) {
                        handleUpdateUser(editingUserId, formData);
                      } else {
                        handleCreateUser(e); // Your original creation logic
                      }
                    }}>
                      <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-input" name="username" value={formData.username} onChange={handleChange} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input className="form-input" type="email" name="email" value={formData.email} onChange={handleChange} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Temporary Password</label>
                        <input
                          className="form-input"
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          // If we are editing, it's NOT required. If we are creating, it IS required.
                          required={!editingUserId}
                          placeholder={editingUserId ? "Leave blank to keep current" : "••••••••"} />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Access Level</label>
                        <select className="form-input" name="role" value={formData.role} onChange={handleChange}>
                          <option value="Viewer">User</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>


                      {editingUserId && (
                        <>
                          <label className="form-label" style={{ marginBottom: 0 }}>Account Status:</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              id="is_active"
                              name="is_active"
                              checked={formData.is_active}
                              onChange={handleChange}
                              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                            <label htmlFor="is_active" style={{ color: formData.is_active ? '#4ade80' : '#f87171', fontSize: '14px', fontWeight: 'bold' }}>
                              {formData.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                            </label>
                          </div>
                        </>
                      )}

                      <div className="modal-actions">
                        <button type="button" className="btn-action-edit" onClick={() => {
                          setEditingUserId(null)
                          setFormData({ username: '', email: '', password: '', role: 'Viewer', is_active: true });
                          setIsModalOpen(false)
                        }}>Cancel</button>
                        <button type="submit" className="btn-primary">Save</button>
                      </div>
                    </form>
                    <div className="corner-mark" />
                  </div>
                </div>
              )}

              {/* SECTION: LOGS */}
              {activeTab === 'logs' && (
                <div className="table-container">
                  <div className="table-header">
                    <h2 className="table-title">System Event Audit Log</h2>
                    <p className="table-subtitle">Cryptographic terminal activity trace_v1.2</p>
                  </div>

                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Activity</th>
                        <th>Operator</th>
                        <th>Log level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td className="timestamp-cell">{log.created_at}</td>
                          <td className="event-cell">{log.message}</td>
                          <td className="operator-cell">{log.user}</td>
                          <td>
                            {log.log_level === 'Info' && (
                              <span className="status-indicator status-active">
                                <span className="status-dot" />
                                Info
                              </span>
                            )}
                            {log.log_level === 'Err' && (
                              <span className="status-indicator status-failed">
                                <span className="status-dot" />
                                Error
                              </span>
                            )}
                            {log.log_level === 'Warn' && (
                              <span className="status-indicator status-warning">
                                <span className="status-dot" />
                                Warning
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="corner-mark" />
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </>
  );
};

// Mock data generator for terminal event tracking
const getMockLogs = () => [
  { id: 1, timestamp: '2026-05-08 22:15:31', event: 'SYS_AUTH: Connection established', user: 'admin', status: 'success', ip: '192.168.1.105' },
  { id: 2, timestamp: '2026-05-08 21:04:12', event: 'SYS_DB: Hotfile core backup initiated', user: 'daemon_00', status: 'success', ip: 'localhost' },
  { id: 3, timestamp: '2026-05-08 19:40:55', event: 'AUTH_FAIL: Invalid SSH identity payload', user: 'guest_99', status: 'failed', ip: '45.122.10.84' },
  { id: 4, timestamp: '2026-05-08 18:12:00', event: 'SEC_AUDIT: Role modification attempted', user: 'j_doe', status: 'warning', ip: '192.168.1.112' },
  { id: 5, timestamp: '2026-05-08 15:30:22', event: 'SYS_CONF: Port 8080 redirected to 443', user: 'admin', status: 'success', ip: '192.168.1.105' }
];

// Reusable Helper Component for themed Stats Card
const StatCard = ({ title, value, icon, color, bgAccent, borderAccent }) => {
  const icons = {
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13.732 4c-.77.923-1.168 2.088-1.168 3.387 0 1.299.398 2.464 1.168 3.387M19.914 21a6.994 6.994 0 00-2.433-4.382m-.032 0h1.59",
    check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    log: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  };

  const cardStyle = {
    '--accent-color': color,
    '--bg-accent': bgAccent,
    '--border-accent': borderAccent
  };

  return (
    <div className="stat-card" style={cardStyle}>
      <div className="stat-card-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons[icon]} />
        </svg>
      </div>
      <div className="stat-card-details">
        <p className="stat-card-title">{title}</p>
        <p className="stat-card-value">{value}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
