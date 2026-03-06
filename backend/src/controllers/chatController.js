// Imports for services
const embeddingService = require('../services/embeddingService');
const vectorService = require('../services/vectorService');
const llmService = require('../services/llmService');
const Document = require('../models/Document');
const ranking = require('../utils/ranking');
const queryProcessing = require('../utils/queryProcessing');

exports.queryChat = async (req, res) => {
  const { query, docId, history } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ message: 'Query is required' });
  }
  if (!docId) {
    return res.status(400).json({ message: 'Please select a document before asking a question.' });
  }
  try {
    const pipeline = [
      { step: 'input', status: 'completed' },
      { step: 'prompting', status: 'completed' },
      { step: 'query_processing', status: 'completed' }
    ];
    const doc = await Document.findOne({ _id: docId, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Selected document not found.' });
    }
    const safeHistory = queryProcessing.sanitizeHistory(history, 6);
    const retrievalQuery = queryProcessing.buildRetrievalQueryFromHistory(query, safeHistory);
    // 1. Embed query
    const qVec = await embeddingService.embedText(retrievalQuery);
    // 2. Search vector store
    const results = await vectorService.search(qVec, 8, req.userId, docId);
    pipeline.push({ step: 'vector_search', status: 'completed' });
    const ranked = ranking.rankChunks(results).slice(0, 5);
    pipeline.push({ step: 'ranking', status: 'completed' });
    if (!ranked.length || ranked[0].score < 0.12) {
      pipeline.push({ step: 'output', status: 'completed' });
      return res.json({
        answer: 'The information is not available in the provided document.',
        sources: [],
        pipeline
      });
    }
    // 3. Build context string
    const context = ranked.map(r => r.metadata.text).join('\n---\n');
    // 4. Call LLM
    const llmQuestion = queryProcessing.buildQuestionForLLM(query, safeHistory);
    const answer = await llmService.answerQuestion(llmQuestion, context);
    pipeline.push({ step: 'llm_synthesis', status: 'completed' });
    pipeline.push({ step: 'output', status: 'completed' });
    const sources = ranked.map((r) => ({
      document: doc.filename,
      chunkIndex: (r.metadata?.chunkIndex ?? 0) + 1,
      score: Number(r.score || 0).toFixed(3),
      preview: (r.metadata?.text || '').replace(/\s+/g, ' ').slice(0, 180)
    }));
    res.json({ answer, sources, pipeline });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateSummary = async (req, res) => {
  const { docId } = req.body;
  try {
    const pipeline = [
      { step: 'input', status: 'completed' },
      { step: 'prompting', status: 'completed' },
      { step: 'query_processing', status: 'completed' }
    ];
    const doc = await Document.findOne({ _id: docId, userId: req.userId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    const summaryQuery = queryProcessing.buildRetrievalQuery('Summarize the full PDF for exam preparation.');
    const qVec = await embeddingService.embedText(summaryQuery);
    const topK = Math.max(12, Math.min(doc.chunkCount || 12, 30));
    const results = await vectorService.search(qVec, topK, req.userId, docId);
    pipeline.push({ step: 'vector_search', status: 'completed' });
    const ranked = ranking.rankChunks(results).slice(0, topK);
    pipeline.push({ step: 'ranking', status: 'completed' });
    if (!ranked.length) {
      pipeline.push({ step: 'output', status: 'completed' });
      return res.json({ summary: 'The information is not available in the provided document.', pipeline });
    }
    const ordered = [...ranked].sort((a, b) => (a.metadata?.chunkIndex || 0) - (b.metadata?.chunkIndex || 0));
    const context = ordered.map(r => r.metadata.text).join('\n---\n');
    const summary = await llmService.summarizeFromRag(context, doc.filename);
    pipeline.push({ step: 'llm_synthesis', status: 'completed' });
    pipeline.push({ step: 'output', status: 'completed' });
    res.json({ summary, pipeline });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateQuiz = async (req, res) => {
  const { docId } = req.body;
  try {
    const doc = await Document.findOne({ _id: docId, userId: req.userId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    const pipeline = [
      { step: 'input', status: 'completed' },
      { step: 'information_extraction', status: doc.processed ? 'completed' : 'pending' },
      { step: 'chunking', status: doc.processed ? 'completed' : 'pending' },
      { step: 'embedding', status: doc.processed ? 'completed' : 'pending' },
      { step: 'vector_storage', status: doc.processed ? 'completed' : 'pending' },
      { step: 'prompting', status: 'completed' },
      { step: 'query_processing', status: 'completed' }
    ];
    const quizQuery = queryProcessing.buildRetrievalQuery('Generate conceptual exam quiz questions from this document.');
    const qVec = await embeddingService.embedText(quizQuery);
    const topK = Math.max(12, Math.min(doc.chunkCount || 12, 30));
    const results = await vectorService.search(qVec, topK, req.userId, docId);
    pipeline.push({ step: 'vector_search', status: 'completed' });
    const ranked = ranking.rankChunks(results).slice(0, topK);
    pipeline.push({ step: 'ranking', status: 'completed' });
    if (!ranked.length) {
      pipeline.push({ step: 'output', status: 'completed' });
      return res.json({ quiz: 'The document does not contain sufficient conceptual content for a quiz.', pipeline });
    }
    const ordered = [...ranked].sort((a, b) => (a.metadata?.chunkIndex || 0) - (b.metadata?.chunkIndex || 0));
    const context = ordered.map(r => r.metadata.text).join('\n---\n');
    const quizText = await llmService.generateQuiz(context, 5);
    pipeline.push({ step: 'llm_synthesis', status: 'completed' });
    pipeline.push({ step: 'output', status: 'completed' });
    res.json({ quiz: quizText, pipeline });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
