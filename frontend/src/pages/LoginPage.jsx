import React, { useState } from 'react';
import { login, signup } from '../services/api';

export default function LoginPage({ onLogin, initialMode = 'login', onModeChange }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [pwdFocus, setPwdFocus] = useState(false);

  // derived validation states
  // const passwordsMatch = password === confirm; // removed
  const validLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resp = isLogin ? await login(email, password) : await signup(email, password, name);
      onLogin(resp);
    } catch (err) {
      console.error(err);
      const fallback = isLogin ? 'Login failed' : 'Signup failed';
      alert(err?.message || fallback);
    }
  };

  return (
    <div className="login-page">
      <div className="auth-modal">
        <h3>{isLogin ? 'Login' : 'Sign Up'}</h3>
        <form onSubmit={handleSubmit}>
          {!isLogin && <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />}
          <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setPwdFocus(true)}
            onBlur={() => setPwdFocus(false)}
          />

          {/* checklist appears immediately beneath password field */}
          {!isLogin && (pwdFocus || password.length>0) && (
            <ul className="pwd-checklist">
              <li className={validLength ? 'valid' : ''}>6+ characters</li>
              <li className={hasUpper ? 'valid' : ''}>contains uppercase</li>
              <li className={hasNumber ? 'valid' : ''}>contains number</li>
            </ul>
          )}

          {!isLogin && (
            <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          )}

          <button
            className="modal-btn"
            type="submit"
            disabled={!isLogin && !(validLength && hasNumber && hasUpper)}
          >{isLogin ? 'Login Now' : 'Create Account'}</button>
        </form>
        <p className="switch-text">
          {isLogin ? 'Not a member?' : 'Already have an account?'}
          <span onClick={() => {
              setIsLogin(!isLogin);
              if (onModeChange) onModeChange(isLogin ? 'signup' : 'login');
          }}>{isLogin ? ' Signup Now' : ' Login'}</span>
        </p>
      </div>
    </div>
  );
}
