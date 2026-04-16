import React, { useState, useEffect } from 'react';
import {
  getChatHistories,
  getChatFolders,
  createChatHistory,
  deleteChatHistory,
  updateChatMetadata,
  archiveChat
} from '../services/api';
import './ChatSidebar.css';

export default function ChatSidebar({ token, docId, onSelectChat, currentChatId, onNewChat, selectedDocument }) {
  const [chats, setChats] = useState([]);
  const [folders, setFolders] = useState(['General']);
  const [selectedFolder, setSelectedFolder] = useState('General');
  const [loading, setLoading] = useState(false);
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [searchText, setSearchText] = useState('');

  // Load chat histories on mount or when folder changes
  useEffect(() => {
    if (!token) return;
    loadChats();
  }, [selectedFolder, token]);

  // Load folders
  useEffect(() => {
    if (!token) return;
    const loadFolders = async () => {
      try {
        const response = await getChatFolders(token);
        setFolders(response.folders || ['General']);
      } catch (err) {
        console.error('Failed to load folders:', err);
      }
    };
    loadFolders();
  }, [token]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const response = await getChatHistories(token, selectedFolder, 50, 0, searchText);
      setChats(response.chats || []);
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewChat = async () => {
    if (!docId || !selectedDocument) {
      alert('Please select a document first');
      return;
    }

    try {
      const chatHistory = await createChatHistory(
        docId,
        newChatTitle || `Chat - ${selectedDocument.filename}`,
        token
      );
      setChats([chatHistory, ...chats]);
      setNewChatTitle('');
      setShowNewChatForm(false);
      onNewChat(chatHistory._id);
      onSelectChat(chatHistory._id);
    } catch (err) {
      alert('Failed to create new chat: ' + err.message);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat?')) return;

    try {
      await deleteChatHistory(chatId, token);
      setChats(chats.filter(c => c._id !== chatId));
      if (currentChatId === chatId) {
        onSelectChat(null);
      }
    } catch (err) {
      alert('Failed to delete chat: ' + err.message);
    }
  };

  const handleRenameChat = async (chatId, e) => {
    e.stopPropagation();
    const chat = chats.find(c => c._id === chatId);
    if (!chat) return;

    const newTitle = prompt('Enter new title:', chat.title);
    if (!newTitle || newTitle === chat.title) return;

    try {
      const updated = await updateChatMetadata(chatId, { title: newTitle }, token);
      setChats(chats.map(c => c._id === chatId ? updated : c));
    } catch (err) {
      alert('Failed to rename chat: ' + err.message);
    }
  };

  const handlePinChat = async (chatId, isPinned, e) => {
    e.stopPropagation();
    try {
      const updated = await updateChatMetadata(
        chatId,
        { isPinned: !isPinned },
        token
      );
      setChats(chats.map(c => c._id === chatId ? updated : c).sort((a, b) => {
        if (a.isPinned === b.isPinned) {
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        return a.isPinned ? -1 : 1;
      }));
    } catch (err) {
      console.error('Failed to pin chat:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <h3>Chat History</h3>
        {docId && (
          <button 
            className="new-chat-btn"
            onClick={() => setShowNewChatForm(!showNewChatForm)}
            title="Start a new chat"
          >
            +
          </button>
        )}
      </div>

      {showNewChatForm && (
        <div className="new-chat-form">
          <input
            type="text"
            placeholder="Chat title (optional)"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleCreateNewChat();
            }}
          />
          <div className="form-buttons">
            <button onClick={handleCreateNewChat} className="btn-create">Create</button>
            <button onClick={() => setShowNewChatForm(false)} className="btn-cancel">Cancel</button>
          </div>
        </div>
      )}

      <div className="search-box">
        <input
          type="text"
          placeholder="Search chats..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyUp={loadChats}
        />
      </div>

      <div className="folders-section">
        <div className="folders-header">Folders</div>
        {folders.map(folder => (
          <button
            key={folder}
            className={`folder-btn ${selectedFolder === folder ? 'active' : ''}`}
            onClick={() => setSelectedFolder(folder)}
          >
            {folder}
          </button>
        ))}
      </div>

      <div className="chats-list">
        {loading ? (
          <div className="loading-state">Loading chats...</div>
        ) : chats.length === 0 ? (
          <div className="empty-state">
            {docId ? 'No chats yet. Start typing to create one!' : 'Select a document to start chatting'}
          </div>
        ) : (
          chats.map(chat => (
            <div
              key={chat._id}
              className={`chat-item ${currentChatId === chat._id ? 'active' : ''}`}
              onMouseEnter={() => setHoveredChatId(chat._id)}
              onMouseLeave={() => setHoveredChatId(null)}
              onClick={() => onSelectChat(chat._id)}
            >
              <div className="chat-item-content">
                <div className="chat-title">{chat.title || 'Untitled Chat'}</div>
                <div className="chat-meta">
                  {chat.messages && chat.messages.length > 0 && (
                    <span className="message-count">{chat.messages.length} messages</span>
                  )}
                  <span className="chat-date">{formatDate(chat.updatedAt)}</span>
                </div>
              </div>

              {hoveredChatId === chat._id && (
                <div className="chat-actions">
                  <button
                    className="action-btn pin-btn"
                    onClick={(e) => handlePinChat(chat._id, chat.isPinned, e)}
                    title={chat.isPinned ? 'Unpin' : 'Pin'}
                  >
                    {chat.isPinned ? '📌' : '📍'}
                  </button>
                  <button
                    className="action-btn rename-btn"
                    onClick={(e) => handleRenameChat(chat._id, e)}
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => handleDeleteChat(chat._id, e)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
