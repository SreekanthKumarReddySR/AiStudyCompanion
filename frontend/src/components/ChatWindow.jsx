import React, { useEffect, useMemo, useState } from 'react';
import { queryChat } from '../services/api';

const CHAT_HISTORY_KEY = 'study_companion_chat_history_v1';
const SAVED_NOTES_KEY = 'study_companion_saved_notes_v1';

export default function ChatWindow({ token, docId, onAssistantSources, onQuestionAsked, selectedDocument }) {
  const [historyByDoc, setHistoryByDoc] = useState({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceSupported(supported);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setHistoryByDoc(parsed);
      }
    } catch (_err) {
      // Ignore malformed local history.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyByDoc));
    } catch (_err) {
      // Ignore storage write failures.
    }
  }, [historyByDoc]);

  const messages = useMemo(() => {
    if (!docId) return [];
    return historyByDoc[docId] || [];
  }, [historyByDoc, docId]);

  const appendMessage = (message) => {
    if (!docId) return;
    setHistoryByDoc((prev) => {
      const existing = prev[docId] || [];
      const updated = [...existing, message].slice(-60);
      return { ...prev, [docId]: updated };
    });
  };

  const buildHistoryPayload = () => [];

  const send = async (textOverride = '') => {
    const overrideText = typeof textOverride === 'string' ? textOverride : '';
    const normalized = (overrideText || input || '').trim();
    if (!normalized || busy) return;
    if (!activeDocId) {
      setError('Please select a document before asking a question.');
      return;
    }
    const userText = normalized;
    const userMsg = { sender: 'user', text: userText };
    appendMessage(userMsg);
    if (typeof onQuestionAsked === 'function') {
      onQuestionAsked();
    }
    setBusy(true);
    setError('');
    try {
      const resp = await queryChat(userText, activeDocId, token, buildHistoryPayload());
      appendMessage({
        sender: 'bot',
        text: resp.answer || 'No answer returned.',
        sources: Array.isArray(resp.sources) ? resp.sources : []
      });
      if (typeof onAssistantSources === 'function' && Array.isArray(resp.sources)) {
        onAssistantSources(resp.sources);
      }
    } catch (err) {
      setError(err.message || 'Failed to query AI');
    }
    setInput('');
    setBusy(false);
  };

  const saveAnswer = (message) => {
    if (!docId || !message?.text) return;
    try {
      const raw = localStorage.getItem(SAVED_NOTES_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const payload = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        docId,
        document: selectedDocument?.filename || 'Selected Document',
        text: message.text,
        sources: Array.isArray(message.sources) ? message.sources : [],
        createdAt: new Date().toISOString()
      };
      const updated = [payload, ...(Array.isArray(existing) ? existing : [])].slice(0, 200);
      localStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('saved_notes_updated'));
    } catch (_err) {
      setError('Unable to save note in local storage.');
    }
  };

  const toggleVoice = () => {
    if (!voiceSupported || busy) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      if (transcript.trim()) {
        setInput(transcript);
        send(transcript);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const clearChatHistory = () => {
    const activeDocId = docId || selectedDocument?._id || selectedDocument?.id || '';
    if (!activeDocId) return;
    const ok = window.confirm('Clear chat history for this document?');
    if (!ok) return;
    setHistoryByDoc((prev) => {
      const next = { ...prev };
      delete next[activeDocId];
      return next;
    });
    setError('');
  };

  const activeDocId = docId || selectedDocument?._id || selectedDocument?.id || '';

  return (
    <div className="chat-card">
      <div className="chat-head">
        <h3>Ask Questions from Your Materials</h3>
        <div className="row-actions">
          <button className="button outline" onClick={clearChatHistory} disabled={busy || !activeDocId}>
            Clear Chat
          </button>
          {voiceSupported && (
            <button className="button outline voice-btn" onClick={toggleVoice} disabled={busy}>
              {listening ? 'Listening...' : 'Ask AI'}
            </button>
          )}
        </div>
      </div>
      <div className="chat-log">
        {!docId && <div className="summary-empty">Select a document to view its chat history.</div>}
        {docId && messages.length === 0 && (
          <div className="summary-empty">No chat history for this document yet. Ask your first question.</div>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`chat-item ${m.sender}`}>{m.text}</div>
            {m.sender === 'bot' && Array.isArray(m.sources) && m.sources.length > 0 && (
              <div className="sources-used">
                <div className="sources-title">Sources used:</div>
                {m.sources.slice(0, 3).map((s, idx) => (
                  <div key={`${i}-src-${idx}`} className="source-chip">
                    {`${s.document} (chunk ${s.chunkIndex})`}
                  </div>
                ))}
              </div>
            )}
            {m.sender === 'bot' && (
              <button className="save-note-btn" onClick={() => saveAnswer(m)}>Save explanation</button>
            )}
          </div>
        ))}
        {busy && (
          <div className="chat-item bot typing-bubble">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="chat-input-row">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask a question from selected PDF..." />
        <button className="button" onClick={() => send()} disabled={busy}>{busy ? 'Thinking...' : 'Send'}</button>
      </div>
    </div>
  );
}
