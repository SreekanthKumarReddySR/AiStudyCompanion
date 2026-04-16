import React, { useState } from 'react';
import { uploadDocument } from '../services/api';
import { useNotification } from '../context/NotificationContext.jsx';

export default function FileUploader({ token, onUploaded }) {
  const notify = useNotification();
  const [file, setFile] = useState(null);
  const [folder, setFolder] = useState('General');
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please choose a file first.');
      notify.warning('Please select a file to upload');
      return;
    }
    setBusy(true);
    setProgress(0);
    setStage('Uploading...');
    setStatus('');
    try {
      const resp = await uploadDocument(file, token, folder, (pct) => {
        setProgress(Math.min(72, Math.max(5, Math.round(pct * 0.72))));
        setStage(`Uploading... ${pct}%`);
      });
      setProgress(84);
      setStage('Processing chunks...');
      const hasEmbedding = Array.isArray(resp?.pipeline)
        ? resp.pipeline.some((p) => p.step === 'embedding' && p.status === 'completed')
        : true;
      if (hasEmbedding) {
        setProgress(94);
        setStage('Generating embeddings...');
      }
      const docId = resp?.document?.id;
      setProgress(100);
      setStage('Done');
      setStatus((resp.message || resp.status || 'Upload request sent.') + (docId ? ` Doc ID: ${docId}` : ''));
      
      // Show success notification
      const fileName = file.name || 'Document';
      notify.success(`${fileName} uploaded successfully and is ready for study!`, 5000);
      
      if (onUploaded) onUploaded(resp.document, resp.summary || '');
      
      // Reset form
      setFile(null);
      setFolder('General');
      setTimeout(() => {
        setProgress(0);
        setStage('');
        setStatus('');
      }, 2000);
    } catch (err) {
      const errorMsg = err.message || 'Upload failed.';
      setStatus(errorMsg);
      setStage('Upload failed');
      setProgress(0);
      
      // Show error notification
      notify.error(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="upload-card">
      <h3>Upload Study Material</h3>
      <p>Supported: PDF, DOCX, TXT</p>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Folder/Subject (optional)</label>
        <input
          type="text"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="e.g., History, Physics, Math"
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Select File</label>
        <input type="file" accept=".pdf,.docx,.txt" onChange={e => setFile(e.target.files[0])} />
        {file && <p style={{ fontSize: '12px', color: '#667eea', marginTop: '4px' }}>Selected: {file.name}</p>}
      </div>
      <button className="button" onClick={handleUpload} disabled={busy} title="Upload your document for processing">
        {busy ? 'Uploading...' : 'Upload Document'}
      </button>
      {(busy || progress > 0) && (
        <div className="upload-progress-wrap">
          <div className="upload-progress-head">
            <span>{stage || 'Starting...'}</span>
            <span>{`${progress}%`}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-inner" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {status && <p className="hint-text">{status}</p>}
    </div>
  );
}
