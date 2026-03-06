import React, { useState } from 'react';
import { signup } from '../services/api';

export default function SignupForm({ onSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resp = await signup(email, password);
      onSignup(resp.data.token);
    } catch (err) {
      console.error(err);
      alert('Signup failed');
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <button className="button" type="submit">Sign Up</button>
    </form>
  );
}
