const Chunk = require('../models/Chunk');
const Document = require('../models/Document');

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) return 0;
  const dim = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < dim; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

exports.add = async (_id, _vector, _metadata) => {
  // Vector is persisted directly in Chunk model.
  return true;
};

exports.search = async (queryVec, topK = 5, userId = null, documentId = null) => {
  let filter = {};
  if (documentId) {
    filter.documentId = documentId;
  }
  if (userId) {
    const docs = await Document.find({ userId }).select('_id');
    const docIds = docs.map(d => d._id);
    filter.documentId = filter.documentId
      ? filter.documentId
      : { $in: docIds };
  }
  const chunks = await Chunk.find(filter).lean();
  const scored = chunks.map((chunk) => ({
    id: chunk._id.toString(),
    vector: chunk.embedding,
    metadata: {
      documentId: chunk.documentId.toString(),
      text: chunk.text,
      chunkIndex: chunk.chunkIndex
    },
    score: cosineSimilarity(chunk.embedding || [], queryVec || [])
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
};
