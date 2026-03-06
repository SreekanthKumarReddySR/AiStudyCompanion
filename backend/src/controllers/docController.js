const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const textService = require('../services/textService');
const fs = require('fs');
const path = require('path');
const llmService = require('../services/llmService');
const embeddingService = require('../services/embeddingService');
const vectorService = require('../services/vectorService');
const ranking = require('../utils/ranking');
const queryProcessing = require('../utils/queryProcessing');

function buildFileUrl(doc) {
  if (!doc?.storedFileName) return '';
  if (doc.contentType !== 'application/pdf') return '';
  const p = path.resolve(__dirname, `../../uploads/docs/${doc.storedFileName}`);
  if (!fs.existsSync(p)) return '';
  return `/uploads/docs/${doc.storedFileName}`;
}

exports.uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  try {
    const pipeline = [{ step: 'input', status: 'completed' }];
    const doc = await textService.processDocument(
      req.file.path,
      req.file.mimetype,
      req.userId,
      req.file.originalname
    );
    const folder = String(req.body?.folder || 'General').trim() || 'General';
    const ext = (path.extname(req.file.originalname || '') || '.bin').toLowerCase();
    const docsDir = path.resolve(__dirname, '../../uploads/docs');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    const storedFileName = `${doc._id}${ext}`;
    const finalPath = path.join(docsDir, storedFileName);
    fs.copyFileSync(req.file.path, finalPath);
    doc.folder = folder;
    doc.storedFileName = storedFileName;
    await doc.save();
    pipeline.push({ step: 'information_extraction', status: 'completed' });
    pipeline.push({ step: 'chunking', status: 'completed' });
    pipeline.push({ step: 'embedding', status: 'completed' });
    pipeline.push({ step: 'vector_storage', status: 'completed' });
    pipeline.push({ step: 'prompting', status: 'completed' });
    pipeline.push({ step: 'query_processing', status: 'completed' });
    const summaryQuery = queryProcessing.buildRetrievalQuery('Summarize the full PDF for exam preparation.');
    const qVec = await embeddingService.embedText(summaryQuery);
    const topK = Math.max(12, Math.min(doc.chunkCount || 12, 30));
    const results = await vectorService.search(qVec, topK, req.userId, doc._id);
    pipeline.push({ step: 'vector_search', status: 'completed' });
    const ranked = ranking.rankChunks(results).slice(0, topK);
    pipeline.push({ step: 'ranking', status: 'completed' });
    const ordered = [...ranked].sort((a, b) => (a.metadata?.chunkIndex || 0) - (b.metadata?.chunkIndex || 0));
    const context = ordered.map(r => r.metadata.text).join('\n---\n');
    const summary = context
      ? await llmService.summarizeFromRag(context, doc.filename)
      : 'The information is not available in the provided document.';
    pipeline.push({ step: 'llm_synthesis', status: 'completed' });
    pipeline.push({ step: 'output', status: 'completed' });
    res.json({
      message: 'Document processed successfully',
      document: {
        id: doc._id,
        filename: doc.filename,
        folder: doc.folder,
        fileUrl: buildFileUrl(doc),
        chunkCount: doc.chunkCount,
        processed: doc.processed
      },
      summary,
      pipeline
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

exports.getChunks = async (req, res) => {
  const { docId } = req.params;
  const doc = await Document.findOne({ _id: docId, userId: req.userId });
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  const chunks = await Chunk.find({ documentId: docId }).select('-embedding');
  res.json({ documentId: docId, chunks });
};

exports.listDocuments = async (req, res) => {
  const docs = await Document.find({ userId: req.userId })
    .select('_id filename folder storedFileName contentType processed chunkCount createdAt')
    .sort({ createdAt: -1 });
  const documents = docs.map((d) => ({
    ...d.toObject(),
    fileUrl: buildFileUrl(d)
  }));
  res.json({ documents });
};

exports.getDocument = async (req, res) => {
  const { docId } = req.params;
  const doc = await Document.findOne({ _id: docId, userId: req.userId });
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  const obj = doc.toObject();
  obj.fileUrl = buildFileUrl(doc);
  res.json({ document: obj });
};

exports.deleteDocument = async (req, res) => {
  const { docId } = req.params;
  const doc = await Document.findOne({ _id: docId, userId: req.userId });
  if (!doc) return res.status(404).json({ message: 'Document not found' });

  await Chunk.deleteMany({ documentId: docId });
  if (doc.storedFileName) {
    const p = path.resolve(__dirname, `../../uploads/docs/${doc.storedFileName}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  await Document.deleteOne({ _id: docId, userId: req.userId });

  res.json({ message: 'Document deleted successfully', docId });
};
