import React, { useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs?v=${pdfjs.version}`;

export default function DocumentPreviewPanel({ fileUrl, isPdf, chunkIndex, chunks = [] }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState('');

  const highlightedChunk = useMemo(() => {
    if (!Number.isInteger(chunkIndex) || chunkIndex < 1) return null;
    return chunks.find((c) => (c.chunkIndex + 1) === chunkIndex) || null;
  }, [chunkIndex, chunks]);

  const onLoadSuccess = ({ numPages: total }) => {
    setPdfError('');
    setNumPages(total);
    setPageNumber((p) => Math.max(1, Math.min(p, total)));
  };

  if (!isPdf) {
    return <div className="summary-empty">PDF preview is available only for .pdf documents.</div>;
  }

  if (!fileUrl) {
    return <div className="summary-empty">No stored PDF found for this document. Re-upload this PDF to enable preview.</div>;
  }

  return (
    <div className="preview-panel">
      <div className="preview-toolbar">
        <button className="button outline" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>
          Prev
        </button>
        <span>{`Page ${pageNumber}${numPages ? ` / ${numPages}` : ''}`}</span>
        <button className="button outline" disabled={numPages > 0 && pageNumber >= numPages} onClick={() => setPageNumber((p) => p + 1)}>
          Next
        </button>
      </div>

      <div className="pdf-canvas-wrap">
        <Document
          file={fileUrl}
          onLoadSuccess={onLoadSuccess}
          onLoadError={(err) => setPdfError(err?.message || 'Failed to load PDF file.')}
        >
          <Page pageNumber={pageNumber} width={620} onRenderError={(err) => setPdfError(err?.message || 'Failed to render PDF page.')} />
        </Document>
      </div>

      {pdfError ? (
        <div className="error-text">
          {`PDF preview error: ${pdfError}`}
          <div style={{ marginTop: '8px' }}>
            <a href={fileUrl} target="_blank" rel="noreferrer">Open PDF in new tab</a>
          </div>
        </div>
      ) : null}

      {highlightedChunk ? (
        <div className="chunk-highlight-box">
          <div className="chunk-highlight-title">{`Highlighted Chunk ${highlightedChunk.chunkIndex + 1}`}</div>
          <div className="chunk-highlight-text">{highlightedChunk.text}</div>
        </div>
      ) : (
        <div className="summary-empty">Ask AI to see which chunk was used and highlighted here.</div>
      )}
    </div>
  );
}
