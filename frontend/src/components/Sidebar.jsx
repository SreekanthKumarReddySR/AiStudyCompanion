import React from 'react';
import UserProfileFooter from './UserProfileFooter';

export default function Sidebar({ onSignOut }) {
  const currentUser = {
    name: 'Tharun',
    email: 'tharunkumarlagisetty@gmail.com'
  };

  return (
    <aside
      style={{
        width: '260px',
        minHeight: '100vh',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'linear-gradient(180deg, #0b1020 0%, #111827 100%)',
        borderRight: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <div style={{ color: '#f8fafc', fontWeight: 700, marginBottom: '8px' }}>StudyCompanion</div>
      <button style={navBtn}>Overview</button>
      <button style={navBtn}>Upload Material</button>
      <button style={navBtn}>Ask AI</button>
      <button style={navBtn}>Summary</button>

      <UserProfileFooter user={currentUser} onSignOut={onSignOut} />
    </aside>
  );
}

const navBtn = {
  textAlign: 'left',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.02)',
  color: '#d1d5db',
  borderRadius: '10px',
  padding: '10px 12px',
  cursor: 'pointer'
};
