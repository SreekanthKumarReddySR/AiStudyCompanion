import React from 'react';
import './UserProfileFooter.css';

export default function UserProfileFooter({ user, onSignOut }) {
  const displayName = user?.name || 'User';
  const email = user?.email || 'user@example.com';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="user-profile-footer">
      <div className="user-profile-top">
        <div className="user-avatar-wrap">
          <div className="user-avatar" aria-hidden="true">
            {avatarLetter}
          </div>
        </div>
        <div className="user-meta">
          <div className="user-name">{displayName}</div>
          <div className="user-email">{email}</div>
        </div>
      </div>

      <button type="button" className="signout-btn" onClick={onSignOut} aria-label="Sign out">
        <svg
          className="signout-icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 7L19 12L14 17M19 12H9M10 5H6C4.89543 5 4 5.89543 4 7V17C4 18.1046 4.89543 19 6 19H10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Sign out</span>
      </button>
    </div>
  );
}
