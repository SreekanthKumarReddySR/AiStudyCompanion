import React, { useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch (_err) {
      return null;
    }
  });
  const [view, setView] = useState('login'); // login or signup when no token

  const handleLogin = (authPayload) => {
    const t = typeof authPayload === 'string' ? authPayload : authPayload?.token;
    const user = typeof authPayload === 'object' ? authPayload?.user : null;
    if (!t) return;
    setToken(t);
    localStorage.setItem('token', t);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
    setView('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    setView('login');
  };

  return (
    <div>
      {!token && view === 'login' && <LoginPage onLogin={handleLogin} onModeChange={setView} />}
      {!token && view === 'signup' && <LoginPage onLogin={handleLogin} initialMode="signup" onModeChange={setView} />}
      {token && <Dashboard token={token} currentUser={currentUser} onLogout={handleLogout} />}
    </div>
  );
}

export default App;
