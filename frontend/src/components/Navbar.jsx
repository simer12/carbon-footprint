import React from 'react';
import { Leaf, Wifi, WifiOff, ShieldAlert, LogOut, Flame } from 'lucide-react';

/**
 * Navbar Component
 * Displays application logo, navigation tabs, user profiles, streaks, and session controls.
 */
export default function Navbar({ activeTab, setActiveTab, backendStatus, user, onLogout }) {
  const isDemo = backendStatus?.demoMode;
  const isOffline = backendStatus?.status === 'offline';
  
  const username = user?.email ? user.email.split('@')[0] : '';

  return (
    <header className="navbar-container glass-card" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 2rem',
      borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
      marginTop: 0,
      marginBottom: '1.5rem',
      borderTop: 'none',
      zIndex: 10
    }}>
      {/* Brand Logo & Name */}
      <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="logo-glow" aria-hidden="true" style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
        }}>
          <Leaf size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', lineHeight: 1.1 }}>EcoTrace</h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>AI Carbon Assistant</span>
        </div>
      </div>

      {/* Navigation Tabs (visible only on mobile/tablet screens) */}
      {user && (
        <nav className="nav-tabs" role="tablist" aria-label="Workspace view options" style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`nav-item-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            style={getTabStyle(activeTab === 'dashboard')}
            role="tab"
            aria-selected={activeTab === 'dashboard'}
            aria-controls="dashboard-tabpanel"
            id="nav-tab-dashboard"
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`nav-item-btn ${activeTab === 'chat' ? 'active' : ''}`}
            style={getTabStyle(activeTab === 'chat')}
            role="tab"
            aria-selected={activeTab === 'chat'}
            aria-controls="chat-tabpanel"
            id="nav-tab-chat"
          >
            AI Coach
          </button>
          <button 
            onClick={() => setActiveTab('actionPlan')}
            className={`nav-item-btn ${activeTab === 'actionPlan' ? 'active' : ''}`}
            style={getTabStyle(activeTab === 'actionPlan')}
            role="tab"
            aria-selected={activeTab === 'actionPlan'}
            aria-controls="actionplan-tabpanel"
            id="nav-tab-actionplan"
          >
            Action Plan
          </button>
        </nav>
      )}

      {/* System Status Indicators & User Profile */}
      <div className="status-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Connection Status */}
        <div className="status-badge-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isOffline ? (
            <div className="badge-status offline" style={statusBadgeStyle('rgba(244, 63, 94, 0.12)', 'var(--color-danger)', 'rgba(244, 63, 94, 0.25)')} role="status" aria-live="polite" aria-label="API connection status: Offline">
              <WifiOff size={13} aria-hidden="true" />
              <span className="status-text">OFFLINE</span>
            </div>
          ) : isDemo ? (
            <div className="badge-status demo-mode" style={statusBadgeStyle('rgba(245, 158, 11, 0.12)', 'var(--color-warning)', 'rgba(245, 158, 11, 0.25)')} role="status" aria-live="polite" aria-label="API connection status: Mock demo mode active" title="Running in Stateful Demo mode. Configure Gemini API key on the backend for live AI calculations.">
              <ShieldAlert size={13} aria-hidden="true" />
              <span className="status-text">MOCK DEMO</span>
            </div>
          ) : (
            <div className="badge-status online" style={statusBadgeStyle('rgba(16, 185, 129, 0.12)', 'var(--color-primary)', 'rgba(16, 185, 129, 0.25)')} role="status" aria-live="polite" aria-label="API connection status: Live Gemini AI active">
              <Wifi size={13} aria-hidden="true" />
              <span className="status-text">AI ONLINE</span>
            </div>
          )}
        </div>

        {/* User Session Profile details */}
        {user && (
          <div className="user-profile-details" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            borderLeft: '1px solid var(--glass-border)',
            paddingLeft: '1rem'
          }}>
            {/* Streak Counter */}
            <div 
              className="streak-badge"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem',
                color: 'var(--color-warning)',
                fontSize: '0.85rem',
                fontWeight: '600'
              }} 
              title="Consecutive Active Streak Days" 
              aria-label={`Sustainability tracking streak: ${user.streak || 0} active days`}
            >
              <Flame size={16} fill="var(--color-warning)" style={{ animation: 'bounceSlow 2s infinite' }} aria-hidden="true" />
              <span>{user.streak || 0}d</span>
            </div>

            {/* User welcome name */}
            <div className="user-welcome" style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff' }}>
                Hi, {username}
              </span>
            </div>

            {/* Logout Button */}
            <button 
              onClick={onLogout}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '0.35rem',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'var(--transition-fast)'
              }}
              className="logout-btn"
              title="Logout Session"
              aria-label="Logout of session"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Styled JSX (Inline fallback) */}
      <style dangerouslySetInnerHTML={{__html: `
        .nav-item-btn {
          font-family: var(--font-heading);
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .nav-item-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-item-btn.active {
          color: var(--color-primary);
          background: rgba(16, 185, 129, 0.1);
        }
        .logout-btn:hover {
          color: var(--color-danger) !important;
          background-color: rgba(244, 63, 94, 0.1);
        }
        
        @media (max-width: 768px) {
          .status-text {
            display: none !important;
          }
        }
        @media (min-width: 1025px) {
          .mobile-only {
            display: none !important;
          }
        }
      `}} />
    </header>
  );
}

function getTabStyle(isActive) {
  return {
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-heading)',
    fontWeight: '500',
    fontSize: '0.9rem',
    cursor: 'pointer',
    border: 'none',
    transition: 'var(--transition-fast)',
    background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
    color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
  };
}

function statusBadgeStyle(bg, color, border) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    background: bg,
    color: color,
    border: `1px solid ${border}`,
    padding: '0.35rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600'
  };
}
