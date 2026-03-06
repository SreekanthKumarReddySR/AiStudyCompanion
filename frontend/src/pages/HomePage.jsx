import React, { useState } from 'react';
import { login, signup } from '../services/api';

export default function HomePage({ onLogin }) {
  const [showModal, setShowModal] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resp = isLogin ? await login(email, password) : await signup(email, password, name);
      onLogin(resp.token || resp.data?.token);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert(isLogin ? 'Login failed' : 'Signup failed');
    }
  };

  return (
    <div className="home-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <h2 className="logo">StudyCompanion AI</h2>
        <ul className="nav-links">
          <li onClick={() => setShowModal(true)}>Home</li>
          <li onClick={() => setShowModal(true)}>Features</li>
          <li onClick={() => setShowModal(true)}>About</li>
          <li onClick={() => setShowModal(true)}>Contact</li>
        </ul>
        <button className="nav-btn" onClick={() => setShowModal(true)}>
          Login
        </button>
      </nav>

      {/* LOGIN MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="auth-modal">
            <span className="close-btn" onClick={() => setShowModal(false)}>
              ✕
            </span>

            <h3>{isLogin ? 'Login' : 'Sign Up'}</h3>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
              )}
              <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} />
              <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />

              <div className="options">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                {isLogin && <span className="link">Forgot password?</span>}
              </div>

              <button className="modal-btn" type="submit">
                {isLogin ? 'Login Now' : 'Create Account'}
              </button>
            </form>

            <p className="switch-text">
              {isLogin ? 'Not a member?' : 'Already have an account?'}
              <span onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? ' Signup Now' : ' Login'}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
