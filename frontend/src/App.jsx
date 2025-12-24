// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import PublicView from './components/PublicView';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [view, setView] = useState('public'); // public, login, admin
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setView('admin');
    }

    // Check URL path
    const path = window.location.pathname;
    if (path.includes('/admin')) {
      setView(token ? 'admin' : 'login');
    }
  }, []);

  const handleNavigate = (newView) => {
    setView(newView);
    
    // Update URL
    if (newView === 'login' || newView === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setView('admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setView('public');
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="App">
      {view === 'public' && <PublicView onNavigate={handleNavigate} />}
      {view === 'login' && <LoginView onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />}
      {view === 'admin' && user && <AdminDashboard user={user} onLogout={handleLogout} />}
    </div>
  );
}

export default App;