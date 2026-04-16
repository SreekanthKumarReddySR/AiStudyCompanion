import React, { useEffect, useState } from 'react';
import './Notification.css';

export default function Notification({ message, type = 'success', duration = 4000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!duration || duration <= 0) return;
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (typeof onClose === 'function') {
        setTimeout(onClose, 300);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const icon = icons[type] || icons.info;

  return (
    <div className={`notification notification-${type} ${isVisible ? 'show' : ''}`}>
      <span className="notification-icon">{icon}</span>
      <span className="notification-message">{message}</span>
      <button 
        className="notification-close" 
        onClick={() => {
          setIsVisible(false);
          if (typeof onClose === 'function') {
            setTimeout(onClose, 300);
          }
        }}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
