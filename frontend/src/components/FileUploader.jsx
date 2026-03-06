import React, { useState } from 'react';
import { uploadDocument } from '../services/api';

export default function FileUploader({ token, onUploaded }) {
  const [file, setFile] = useState(null);
  const [folder, setFolder] = useState('General');
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please choose a file first.');
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
      if (onUploaded) onUploaded(resp.document, resp.summary || '');
    } catch (err) {
      setStatus(err.message || 'Upload failed.');
      setStage('Upload failed');
      setProgress(0);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="upload-card">
      <h3>Upload Study Material</h3>
      <p>Supported: PDF, DOCX, TXT</p>
      <input
        type="text"
        value={folder}
        onChange={(e) => setFolder(e.target.value)}
        placeholder="Folder (e.g., History, Physics)"
      />
      <input type="file" accept=".pdf,.docx,.txt" onChange={e => setFile(e.target.files[0])} />
      <button className="button" onClick={handleUpload} disabled={busy}>
        {busy ? 'Uploading...' : 'Upload'}
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
