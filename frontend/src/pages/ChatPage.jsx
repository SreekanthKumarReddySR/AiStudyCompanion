import React from 'react';
import ChatWindow from '../components/ChatWindow';

export default function ChatPage({ token }) {
  return (
    <div>
      <h2>Chat with AI</h2>
      <ChatWindow token={token} />
    </div>
  );
}
