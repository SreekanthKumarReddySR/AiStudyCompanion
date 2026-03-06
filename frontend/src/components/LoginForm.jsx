import React, { useState } from 'react';
import { login } from '../services/api';

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resp = await login(email, password);
      onLogin(resp.data.token);
    } catch (err) {
      console.error(err);
      alert('Login failed');
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <button className="button" type="submit">Login</button>
    </form>
  );
}
