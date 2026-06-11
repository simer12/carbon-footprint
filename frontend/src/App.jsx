import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import ActionPlan from './components/ActionPlan';
import { 
  getBackendStatus, 
  sendChatMessage, 
  register, 
  login, 
  getCurrentUser, 
  fetchActivities, 
  deleteActivityLog, 
  fetchActionPlan, 
  toggleActionTask,
  setAuthToken,
  getAuthToken
} from './services/api';
import { Leaf, Sparkles, Mail, Lock } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'dashboard', 'chat', 'actionPlan'
  
  // App States
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [actionPlan, setActionPlan] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  
  const [backendStatus, setBackendStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Authentication Screen States
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // 1. Initialize Connection and session restoration
  useEffect(() => {
    const initializeApp = async () => {
      const status = await getBackendStatus();
      setBackendStatus(status);

      const token = getAuthToken();
      if (token) {
        try {
          // Verify token and restore session details
          const userData = await getCurrentUser();
          setUser(userData.user);
          
          // Fetch user specific state from server
          const userLogs = await fetchActivities();
          setActivities(userLogs);
          
          const userActions = await fetchActionPlan();
          setActionPlan(userActions);

          // Restore local chat history
          const cachedChat = localStorage.getItem(`ecotrace_chat_${userData.user.id}`);
          if (cachedChat) {
            setChatHistory(JSON.parse(cachedChat));
          } else {
            setChatHistory([
              { sender: 'coach', text: `Welcome back, ${userData.user.email.split('@')[0]}! I have restored your session. How are your carbon tracking goals going today?` }
            ]);
          }
        } catch (error) {
          console.error('Session restoration failed:', error);
          setAuthToken(null); // Clear expired/invalid token
        }
      }
      setIsInitializing(false);
    };

    initializeApp();
  }, []);

  // Active Responsive Tab Router hook
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setActiveTab('all');
      } else if (activeTab === 'all') {
        setActiveTab('dashboard'); // Default focus tab on mobile
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // trigger on initial mount

    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Sync chat history to localstorage per user
  useEffect(() => {
    if (user && chatHistory.length > 0) {
      localStorage.setItem(`ecotrace_chat_${user.id}`, JSON.stringify(chatHistory));
    }
  }, [chatHistory, user]);

  // 2. Auth Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      let data;
      if (authMode === 'login') {
        data = await login(authEmail, authPassword);
      } else {
        data = await register(authEmail, authPassword);
      }

      setUser(data.user);
      
      // Fetch initial data
      const userLogs = await fetchActivities();
      setActivities(userLogs);
      
      const userActions = await fetchActionPlan();
      setActionPlan(userActions);

      // Setup initial welcome chat
      setChatHistory([
        { sender: 'coach', text: `Hello ${data.user.email.split('@')[0]}! I am EcoGuide, your AI carbon coaching assistant. Tell me about your daily habits (e.g., 'I drove 15 miles', 'Had chicken for lunch') and I will analyze them and update your dashboard!` }
      ]);
    } catch (error) {
      setAuthError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setActivities([]);
    setActionPlan([]);
    setChatHistory([]);
    setAuthEmail('');
    setAuthPassword('');
  };

  // 3. Activity & Chat Handlers
  const handleSendMessage = async (text) => {
    const updatedHistory = [...chatHistory, { sender: 'user', text }];
    setChatHistory(updatedHistory);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(text, chatHistory);
      
      setChatHistory(prev => [...prev, { sender: 'coach', text: response.text }]);

      // Update state arrays synchronously from backend DB responses
      if (response.activities) {
        setActivities(response.activities);
      }
      if (response.actionPlan) {
        setActionPlan(response.actionPlan);
      }
      if (response.user) {
        setUser(response.user); // Sync streak updates
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory(prev => [...prev, { 
        sender: 'coach', 
        text: "I encountered a communication error. Please try logging your activity again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteActivity = async (id) => {
    try {
      await deleteActivityLog(id);
      setActivities(prev => prev.filter(act => act.id !== id));
      
      // If the deleted activity was linked to a checklist task, sync that change
      const deletedActivity = activities.find(act => act.id === id);
      if (deletedActivity && deletedActivity.description.startsWith('Completed: ')) {
        const taskName = deletedActivity.description.replace('Completed: ', '');
        setActionPlan(prev => prev.map(task => 
          task.task === taskName ? { ...task, completed: false } : task
        ));
      }
    } catch (error) {
      console.error('Failed to delete activity:', error);
    }
  };

  const handleToggleAction = async (id) => {
    try {
      const response = await toggleActionTask(id);
      
      // Synchronize task states and credit log additions from server response
      setActionPlan(response.actionPlan);
      setActivities(response.activities);
    } catch (error) {
      console.error('Failed to toggle action task:', error);
    }
  };

  // 4. Loading States Render
  if (isInitializing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: '#fff',
        fontFamily: 'var(--font-heading)'
      }}>
        <Leaf size={48} color="var(--color-primary)" className="spin-slow" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: '500', letterSpacing: '0.05em' }}>INITIALIZING ECOTRACE...</h2>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin-slow {
            animation: spinSlow 3s linear infinite;
          }
        `}} />
      </div>
    );
  }

  // 5. Auth Screen Render (if session is not present)
  if (!user) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        background: 'var(--bg-primary)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background blobs */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div className="glass-card auth-card" style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2.5rem 2rem',
          animation: 'fadeInUp 0.4s ease-out'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
              marginBottom: '1rem'
            }}>
              <Leaf size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>Welcome to EcoTrace</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Track and reduce your carbon footprint with AI.
            </p>
          </div>

          {/* Tab Toggles */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '0.25rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--glass-border)'
          }}>
            <button 
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              style={{
                flex: 1,
                border: 'none',
                background: authMode === 'login' ? 'var(--glass-bg-hover)' : 'transparent',
                color: authMode === 'login' ? '#fff' : 'var(--text-secondary)',
                padding: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'var(--transition-fast)'
              }}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              style={{
                flex: 1,
                border: 'none',
                background: authMode === 'register' ? 'var(--glass-bg-hover)' : 'transparent',
                color: authMode === 'register' ? '#fff' : 'var(--text-secondary)',
                padding: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'var(--transition-fast)'
              }}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {authError && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                color: 'var(--color-danger)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                lineHeight: '1.4'
              }}>
                {authError}
              </div>
            )}

            {/* Email Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label htmlFor="email" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }}>
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={authInputStyle}
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label htmlFor="password" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }}>
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  style={authInputStyle}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isAuthLoading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                marginTop: '0.5rem',
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center'
              }}
            >
              {isAuthLoading ? 'Please Wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 6. Stateful Dashboard Render (Authenticated State)
  return (
    <div className="app-container">
      {/* Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        backendStatus={backendStatus}
        user={user}
        onLogout={handleLogout}
      />

      {/* Connection Banner Alert */}
      {backendStatus?.demoMode && (
        <div className="demo-banner" style={{ marginBottom: '1rem' }}>
          <span>
            ⚠️ <strong>Mock Demo Mode active:</strong> Live Gemini calculations are disabled. Add a <code>GEMINI_API_KEY</code> to the backend <code>.env</code> file.
          </span>
        </div>
      )}

      {/* Workspace Grid */}
      <main className="main-content">
        
        {/* Left Section (Overview / Dashboard / Action Checklist) */}
        <div className="left-section" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          gridColumn: activeTab === 'all' ? '1' : undefined
        }}>
          {(activeTab === 'all' || activeTab === 'dashboard') && (
            <Dashboard 
              activities={activities} 
              onDeleteActivity={handleDeleteActivity} 
            />
          )}

          {(activeTab === 'all' || activeTab === 'actionPlan') && (
            <ActionPlan 
              actionPlan={actionPlan} 
              onToggleAction={handleToggleAction} 
            />
          )}
        </div>

        {/* Right Section (Conversational Chatbot) */}
        <div className="right-section" style={{
          display: activeTab === 'all' || activeTab === 'chat' ? 'block' : 'none'
        }}>
          <ChatInterface 
            chatHistory={chatHistory} 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
          />
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '2rem 0',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        borderTop: '1px solid var(--glass-border)',
        marginTop: '2rem'
      }}>
        <p>© 2026 EcoTrace Carbon Awareness Hub. Built for Hackathon Challenge 3. Production Ready.</p>
      </footer>
    </div>
  );
}

// Inline input styles
const authInputStyle = {
  width: '100%',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--glass-border)',
  padding: '0.75rem 1rem 0.75rem 2.5rem',
  borderRadius: 'var(--radius-md)',
  color: '#fff',
  outline: 'none',
  fontSize: '0.875rem',
  transition: 'var(--transition-fast)',
  fontFamily: 'var(--font-body)'
};
