import React, { useEffect, useMemo, useState } from 'react';
import FileUploader from '../components/FileUploader.jsx';
import ChatWindow from '../components/ChatWindow.jsx';
import ChatSidebar from '../components/ChatSidebar.jsx';
import OnboardingOverlay from '../components/OnboardingOverlay.jsx';
import UserProfileFooter from '../components/UserProfileFooter.jsx';
import DocumentPreviewPanel from '../components/DocumentPreviewPanel.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import aiTeachLogo from '../assets/ai-teach-logo.svg';
import {
  summarize,
  listDocuments,
  getDocument,
  getChunks,
  deleteDocument,
  getAnalytics,
  incrementAnalytics,
  updateOnboardingStatus,
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

export default function Dashboard({ token, currentUser, onLogout, onUpdateUser }) {
  const notify = useNotification();
  const [active, setActive] = useState('overview');
  const [docId, setDocId] = useState('');
  const [currentChatId, setCurrentChatId] = useState(null);
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
  const [onboardingVisible, setOnboardingVisible] = useState(Boolean(currentUser?.firstTime));
  const [onboardingStep, setOnboardingStep] = useState(Number(currentUser?.onboardingStep ?? 0));
  const onboardingSteps = useMemo(() => [
    {
      title: 'Upload your study material',
      description: 'Use the Upload section to add your PDFs, slides, or notes so AI can review them.',
      detail: 'Upload once and the app keeps your content ready for questions, summaries, and saved notes.'
    },
    {
      title: 'Select the active document',
      description: 'Pick a document from the list so Ask AI and Summary use the right material.',
      detail: 'This helps the assistant answer questions using the correct source file.'
    },
    {
      title: 'Ask AI anything',
      description: 'Go to Ask AI and type a question about your selected document.',
      detail: 'You can ask for explanations, definitions, examples, or exam-style answers.'
    },
    {
      title: 'Generate a summary',
      description: 'Use the Summary feature to create a structured study overview from your document.',
      detail: 'This saves time and helps you find key points quickly during revision.'
    },
    {
      title: 'Save your best notes',
      description: 'Use Saved Notes to keep important answers for later review.',
      detail: 'A personal revision library makes exam prep faster and more reliable.'
    }
  ], []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    setOnboardingVisible(Boolean(currentUser?.firstTime));
    setOnboardingStep(Number(currentUser?.onboardingStep ?? 0));
  }, [currentUser]);

  const saveCurrentUserState = (patch) => {
    const next = {
      ...currentUser,
      ...patch
    };
    if (typeof onUpdateUser === 'function') {
      onUpdateUser(next);
    }
    try {
      localStorage.setItem('currentUser', JSON.stringify(next));
    } catch (_err) {
      // ignore local storage issues
    }
  };

  const updateOnboarding = async (nextStep, complete = false) => {
    try {
      const response = await updateOnboardingStatus(token, !complete, nextStep);
      const updatedUser = response?.user;
      if (updatedUser) {
        saveCurrentUserState(updatedUser);
      }
    } catch (err) {
      console.error('Unable to persist onboarding state', err);
    }
  };

  const handleOnboardingNext = async () => {
    const nextStep = onboardingStep + 1;
    const done = nextStep >= onboardingSteps.length;
    setOnboardingStep(nextStep);
    if (done) {
      setOnboardingVisible(false);
    }
    await updateOnboarding(done ? nextStep : nextStep, done);
  };

  const handleSkipOnboarding = async () => {
    setOnboardingVisible(false);
    await updateOnboarding(onboardingSteps.length, true);
  };

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
    if (!documents.length) {
      if (docId) setDocId('');
      return;
    }
    if (!docId) {
      setDocId(documents[0]._id);
      return;
    }
    const existsInAll = documents.some((d) => d._id === docId);
    if (!existsInAll) {
      setDocId(documents[0]._id);
    }
  }, [documents, docId]);

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
      notify.warning('Please select a document to summarize');
      return;
    }
    setError('');
    setBusy(true);
    notify.info('Generating summary... This may take a moment', 0);
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
      notify.success('Summary generated successfully! Review it in the Summary tab', 5000);
    } catch (err) {
      setError(err.message || 'Failed to generate summary.');
      notify.error(err.message || 'Failed to generate summary');
    } finally {
      setBusy(false);
    }
  };

  const handleUploaded = async (document, uploadSummary) => {
    const uploadedDocId = document?.id || document?._id || '';
    if (uploadedDocId) setDocId(uploadedDocId);
    if (uploadSummary) {
      setSummary(uploadSummary);
      setActive('summary');
    }
    await loadDocuments();
  };

  const handleDeleteDocument = async () => {
    if (!docId) {
      setError('Select a document to delete.');
      notify.warning('Please select a document to delete');
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
      notify.success('Document deleted successfully', 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete document.');
      notify.error(err.message || 'Failed to delete document');
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
      {onboardingVisible && currentUser?.firstTime && (
        <OnboardingOverlay
          visible={onboardingVisible}
          step={Math.min(onboardingStep, onboardingSteps.length - 1)}
          totalSteps={onboardingSteps.length}
          onAdvance={handleOnboardingNext}
          onSkip={handleSkipOnboarding}
          stepData={onboardingSteps[onboardingStep] || onboardingSteps[0]}
        />
      )}
      <aside className="study-sidebar">
        <div className="brand">
          <img src={aiTeachLogo} alt="StudyCompanion AI logo showing AI teaching students" className="brand-logo sidebar-logo" />
        </div>
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
              <div className="overview-card guide-card">
                <h3>First-Time User Guide</h3>
                <div className="guide-grid">
                  <div className="guide-step">
                    <div className="guide-step-label">Upload Material</div>
                    <p>Click the Upload tab to add your PDF, DOCX, or TXT notes.</p>
                  </div>
                  <div className="guide-step">
                    <div className="guide-step-label">Select Document</div>
                    <p>Choose your uploaded file from the Documents list.</p>
                  </div>
                  <div className="guide-step">
                    <div className="guide-step-label">Quick Ask</div>
                    <p>Go to Ask AI and type a question about the selected document.</p>
                  </div>
                  <div className="guide-step">
                    <div className="guide-step-label">Generate Summary</div>
                    <p>Use the Summary button to create a structured study overview.</p>
                  </div>
                  <div className="guide-step">
                    <div className="guide-step-label">Saved Notes</div>
                    <p>Save important answers for easy exam revision later.</p>
                  </div>
                </div>
                <div className="guide-actions">
                  <button className="button outline" onClick={() => setActive('upload')}>Upload Document</button>
                  <button className="button" onClick={() => setActive('chat')}>Ask AI</button>
                </div>
              </div>
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
            <div style={{ display: 'flex', gap: '16px', height: '100%' }}>
              <ChatSidebar 
                token={token}
                docId={docId}
                selectedDocument={selectedDoc}
                currentChatId={currentChatId}
                onSelectChat={setCurrentChatId}
                onNewChat={(chatId) => setCurrentChatId(chatId)}
              />
              <ChatWindow
                token={token}
                docId={docId}
                selectedDocument={selectedDoc}
                currentChatId={currentChatId}
                onSelectChat={setCurrentChatId}
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
            </div>
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
