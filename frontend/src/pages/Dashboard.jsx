import React, { useEffect, useMemo, useState } from 'react';
import FileUploader from '../components/FileUploader';
import ChatWindow from '../components/ChatWindow';
import UserProfileFooter from '../components/UserProfileFooter';
import DocumentPreviewPanel from '../components/DocumentPreviewPanel';
import {
  summarize,
  listDocuments,
  getDocument,
  getChunks,
  deleteDocument,
  getAnalytics,
  incrementAnalytics,
  API_ORIGIN
} from '../services/api';

const SAVED_NOTES_KEY = 'study_companion_saved_notes_v1';
const DEFAULT_ANALYTICS = { questionsAsked: 0, summariesGenerated: 0, studyTimeMs: 0 };

function SummaryView({ text }) {
  if (!text) return <div className="summary-empty">Generate a summary from Overview.</div>;
  return <div className="summary-text">{text}</div>;
}

function formatStudyTime(ms) {
  const totalMinutes = Math.floor((ms || 0) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function normalizeFileUrl(fileUrl) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
  return `${API_ORIGIN}${fileUrl}`;
}

export default function Dashboard({ token, currentUser, onLogout }) {
  const [active, setActive] = useState('overview');
  const [docId, setDocId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [folderFilter, setFolderFilter] = useState('All');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [highlightedChunkIndex, setHighlightedChunkIndex] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [savedNotesTick, setSavedNotesTick] = useState(0);
  const [analytics, setAnalytics] = useState(DEFAULT_ANALYTICS);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    setAnalytics(DEFAULT_ANALYTICS);

    const loadAnalytics = async () => {
      try {
        const resp = await getAnalytics(token);
        if (cancelled) return;
        const next = resp?.analytics || DEFAULT_ANALYTICS;
        setAnalytics({
          questionsAsked: Number(next.questionsAsked) || 0,
          summariesGenerated: Number(next.summariesGenerated) || 0,
          studyTimeMs: Number(next.studyTimeMs) || 0
        });
      } catch (_err) {
        if (!cancelled) {
          setAnalytics(DEFAULT_ANALYTICS);
        }
      }
    };

    loadAnalytics();

    const id = setInterval(() => {
      incrementAnalytics({ studyTimeMs: 30000 }, token)
        .then((resp) => {
          if (cancelled) return;
          const next = resp?.analytics || DEFAULT_ANALYTICS;
          setAnalytics({
            questionsAsked: Number(next.questionsAsked) || 0,
            summariesGenerated: Number(next.summariesGenerated) || 0,
            studyTimeMs: Number(next.studyTimeMs) || 0
          });
        })
        .catch((err) => {
          console.error('Analytics increment failed (study time):', err);
        });
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  useEffect(() => {
    const onSaved = () => setSavedNotesTick((v) => v + 1);
    window.addEventListener('saved_notes_updated', onSaved);
    return () => window.removeEventListener('saved_notes_updated', onSaved);
  }, []);

  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      const resp = await listDocuments(token);
      const docs = resp.documents || [];
      setDocuments(docs);
      if (docs.length && !docId) setDocId(docs[0]._id);
    } catch (err) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const folderOptions = useMemo(() => {
    const set = new Set(['All', 'History', 'Physics', 'Machine Learning']);
    documents.forEach((d) => set.add(d.folder || 'General'));
    return Array.from(set);
  }, [documents]);

  const visibleDocs = useMemo(() => {
    if (folderFilter === 'All') return documents;
    return documents.filter((d) => (d.folder || 'General') === folderFilter);
  }, [documents, folderFilter]);

  useEffect(() => {
    if (!docId) return;
    const exists = visibleDocs.some((d) => d._id === docId);
    if (!exists) {
      setDocId(visibleDocs.length ? visibleDocs[0]._id : '');
    }
  }, [visibleDocs, docId]);

  useEffect(() => {
    const loadSelectedDoc = async () => {
      if (!docId) {
        setSelectedDoc(null);
        setChunks([]);
        return;
      }
      try {
        const [docResp, chunkResp] = await Promise.all([getDocument(docId, token), getChunks(docId, token)]);
        setSelectedDoc(docResp.document || null);
        setChunks(chunkResp.chunks || []);
      } catch (_err) {
        setSelectedDoc(null);
        setChunks([]);
      }
    };
    loadSelectedDoc();
  }, [docId, token]);

  const runSummary = async () => {
    if (!docId.trim()) {
      setError('Enter a document ID first.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const resp = await summarize(docId.trim(), token);
      setSummary(resp.summary || 'No summary returned.');
      try {
        const updated = await incrementAnalytics({ summariesGenerated: 1 }, token);
        const next = updated?.analytics || DEFAULT_ANALYTICS;
        setAnalytics({
          questionsAsked: Number(next.questionsAsked) || 0,
          summariesGenerated: Number(next.summariesGenerated) || 0,
          studyTimeMs: Number(next.studyTimeMs) || 0
        });
      } catch (_ignored) {
        console.error('Analytics increment failed (summary).');
        // Keep summary success even if analytics update fails.
      }
      setActive('summary');
    } catch (err) {
      setError(err.message || 'Failed to generate summary.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploaded = async (document, uploadSummary) => {
    if (document?.id) setDocId(document.id);
    if (uploadSummary) {
      setSummary(uploadSummary);
      setActive('summary');
    }
    await loadDocuments();
  };

  const handleDeleteDocument = async () => {
    if (!docId) {
      setError('Select a document to delete.');
      return;
    }
    const ok = window.confirm('Delete this uploaded document and its chunks? This action cannot be undone.');
    if (!ok) return;
    setError('');
    setBusy(true);
    try {
      await deleteDocument(docId, token);
      setSummary('');
      setSelectedDoc(null);
      setChunks([]);
      const current = documents.filter((d) => d._id !== docId);
      setDocuments(current);
      setDocId(current.length ? current[0]._id : '');
      setActive('overview');
    } catch (err) {
      setError(err.message || 'Failed to delete document.');
    } finally {
      setBusy(false);
    }
  };

  const documentsUploaded = documents.length;
  const savedNotes = useMemo(() => {
    try {
      const raw = localStorage.getItem(SAVED_NOTES_KEY);
      if (!raw) return [];
      const notes = JSON.parse(raw);
      if (!Array.isArray(notes)) return [];
      return notes;
    } catch (_err) {
      return [];
    }
  }, [savedNotesTick]);
  const visibleSavedNotes = useMemo(() => {
    if (!docId) return savedNotes;
    return savedNotes.filter((n) => n.docId === docId);
  }, [savedNotes, docId]);

  return (
    <div className="study-shell">
      <aside className="study-sidebar">
        <div className="brand">StudyCompanion</div>
        <button className={`side-item ${active === 'overview' ? 'active' : ''}`} onClick={() => setActive('overview')}>
          <span className="side-icon">📊</span>Overview
        </button>
        <button className={`side-item ${active === 'upload' ? 'active' : ''}`} onClick={() => setActive('upload')}>
          <span className="side-icon">📁</span>Upload Material
        </button>
        <button className={`side-item ${active === 'chat' ? 'active' : ''}`} onClick={() => setActive('chat')}>
          <span className="side-icon">💬</span>Ask AI
        </button>
        <button className={`side-item ${active === 'summary' ? 'active' : ''}`} onClick={() => setActive('summary')}>
          <span className="side-icon">📝</span>Summary
        </button>
        <button className={`side-item ${active === 'saved' ? 'active' : ''}`} onClick={() => setActive('saved')}>
          <span className="side-icon">⭐</span>Saved Notes
        </button>
        <UserProfileFooter
          user={currentUser || { name: 'Tharun', email: 'tharunkumarlagisetty@gmail.com' }}
          onSignOut={onLogout}
        />
      </aside>

      <main className="study-main">
        <header className="study-header">
          <div>
            <h1>Welcome back</h1>
            <p>Upload notes, ask questions, generate summaries, and preview source PDFs.</p>
          </div>
          <div className="quick-actions">
            <button className="button outline" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
              {theme === 'dark' ? '🌙 Dark' : '☀ Light'}
            </button>
            <button className="button outline" onClick={() => setActive('upload')}>Bulk Upload</button>
            <button className="button" onClick={() => setActive('chat')}>Quick Ask</button>
          </div>
        </header>

        <div className="stats-row">
          <div className="stat-card"><strong>{documentsUploaded}</strong><span>Documents uploaded</span></div>
          <div className="stat-card"><strong>{analytics.questionsAsked || 0}</strong><span>Questions asked</span></div>
          <div className="stat-card"><strong>{analytics.summariesGenerated || 0}</strong><span>Summaries generated</span></div>
          <div className="stat-card"><strong>{formatStudyTime(analytics.studyTimeMs || 0)}</strong><span>Study time</span></div>
        </div>

        <section className="study-panel">
          {active === 'overview' && (
            <div className="overview-grid">
              {documentsUploaded === 0 && (
                <div className="overview-card preview-card empty-state-card">
                  <h3>Get Started</h3>
                  <p>Upload your first document to start studying with AI.</p>
                  <button className="button" onClick={() => setActive('upload')}>Upload First Document</button>
                </div>
              )}
              <div className="overview-card">
                <h3>Folders / Subjects</h3>
                <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)}>
                  {folderOptions.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="overview-card">
                <h3>Documents</h3>
                <p>Select one uploaded document for summary and chat.</p>
                <select value={docId} onChange={(e) => setDocId(e.target.value)}>
                  <option value="">{loadingDocs ? 'Loading...' : 'Select a document'}</option>
                  {visibleDocs.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.filename} ({doc.chunkCount} chunks)
                    </option>
                  ))}
                </select>
                <input value={docId} onChange={(e) => setDocId(e.target.value)} placeholder="Or paste document id..." />
              </div>
              <div className="overview-card">
                <h3>Actions</h3>
                <div className="row-actions">
                  <button className="button secondary" onClick={runSummary} disabled={busy}>Generate Summary</button>
                  <button className="button danger" onClick={handleDeleteDocument} disabled={busy || !docId}>Delete Upload</button>
                </div>
              </div>
              <div className="overview-card">
                <h3>Selected Document Overview</h3>
                {!selectedDoc && <p>No document selected.</p>}
                {selectedDoc && (
                  <div className="doc-meta">
                    <p><strong>File:</strong> {selectedDoc.filename}</p>
                    <p><strong>Folder:</strong> {selectedDoc.folder || 'General'}</p>
                    <p><strong>Chunks:</strong> {selectedDoc.chunkCount}</p>
                    <p><strong>Processed:</strong> {selectedDoc.processed ? 'Yes' : 'No'}</p>
                    <p><strong>Preview:</strong> {(selectedDoc.originalText || '').slice(0, 260)}...</p>
                  </div>
                )}
              </div>
              <div className="overview-card preview-card">
                <h3>📄 View Document</h3>
                <DocumentPreviewPanel
                  fileUrl={normalizeFileUrl(selectedDoc?.fileUrl)}
                  isPdf={selectedDoc?.contentType === 'application/pdf'}
                  chunkIndex={highlightedChunkIndex}
                  chunks={chunks}
                />
              </div>
            </div>
          )}

          {active === 'upload' && <FileUploader token={token} onUploaded={handleUploaded} />}
          {active === 'chat' && (
            <ChatWindow
              token={token}
              docId={docId}
              selectedDocument={selectedDoc}
              onQuestionAsked={async () => {
                try {
                  const updated = await incrementAnalytics({ questionsAsked: 1 }, token);
                  const next = updated?.analytics || DEFAULT_ANALYTICS;
                  setAnalytics({
                    questionsAsked: Number(next.questionsAsked) || 0,
                    summariesGenerated: Number(next.summariesGenerated) || 0,
                    studyTimeMs: Number(next.studyTimeMs) || 0
                  });
                } catch (_ignored) {
                  console.error('Analytics increment failed (question).');
                  // Ignore analytics update errors during chat.
                }
              }}
              onAssistantSources={(sources) => {
                const first = sources?.[0];
                if (first?.chunkIndex) setHighlightedChunkIndex(first.chunkIndex);
              }}
            />
          )}
          {active === 'summary' && (
            <div className="result-card">
              <h3>Summary</h3>
              <SummaryView text={summary} />
            </div>
          )}
          {active === 'saved' && (
            <div className="result-card">
              <h3>Saved Notes</h3>
              {visibleSavedNotes.length === 0 ? (
                <div className="summary-empty">
                  No saved explanations yet. Save answers from Ask AI using the "Save explanation" button.
                </div>
              ) : (
                <div className="saved-notes-list">
                  {visibleSavedNotes.map((note) => (
                    <div key={note.id} className="saved-note-item">
                      <div className="saved-note-meta">
                        <strong>{note.document}</strong>
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p>{note.text}</p>
                      {Array.isArray(note.sources) && note.sources.length > 0 && (
                        <div className="sources-used">
                          <div className="sources-title">Sources used:</div>
                          {note.sources.slice(0, 3).map((s, idx) => (
                            <div key={`${note.id}-${idx}`} className="source-chip">
                              {`${s.document} (chunk ${s.chunkIndex})`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
        </section>
      </main>
    </div>
  );
}
