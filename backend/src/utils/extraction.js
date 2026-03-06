// helpers for extracting text from various document types
const fs = require('fs');
const path = require('path');

function shouldSuppressPdfWarning(message) {
  const text = String(message || '');
  return (
    text.includes('Warning: Ran out of space in font private use area.') ||
    text.includes('Warning: Badly formatted number')
  );
}

async function parsePdfQuietly(pdfParse, buffer) {
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalStderrWrite = process.stderr.write;

  console.warn = (...args) => {
    const msg = args.join(' ');
    if (!shouldSuppressPdfWarning(msg)) {
      originalWarn.apply(console, args);
    }
  };

  console.error = (...args) => {
    const msg = args.join(' ');
    if (!shouldSuppressPdfWarning(msg)) {
      originalError.apply(console, args);
    }
  };

  process.stderr.write = function patchedStderr(chunk, encoding, cb) {
    const msg = typeof chunk === 'string' ? chunk : chunk?.toString?.(encoding || 'utf8') || '';
    if (shouldSuppressPdfWarning(msg)) {
      if (typeof cb === 'function') cb();
      return true;
    }
    return originalStderrWrite.call(process.stderr, chunk, encoding, cb);
  };

  try {
    return await pdfParse(buffer);
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
    process.stderr.write = originalStderrWrite;
  }
}

exports.extractText = async (filePath, mimeType) => {
  const ext = path.extname(filePath).toLowerCase();
  const isTxt = mimeType === 'text/plain' || ext === '.txt';
  const isPdf = mimeType === 'application/pdf' || ext === '.pdf';
  const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx';

  if (isTxt) {
    return fs.readFileSync(filePath, 'utf8');
  }

  if (isPdf) {
    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
    } catch (_err) {
      throw new Error('PDF support requires installing pdf-parse');
    }
    const buffer = fs.readFileSync(filePath);
    const parsed = await parsePdfQuietly(pdfParse, buffer);
    return (parsed.text || '').trim();
  }

  if (isDocx) {
    let mammoth;
    try {
      mammoth = require('mammoth');
    } catch (_err) {
      throw new Error('DOCX support requires installing mammoth');
    }
    const result = await mammoth.extractRawText({ path: filePath });
    return (result.value || '').trim();
  }

  throw new Error(`Unsupported file type: ${mimeType || ext}`);
};
