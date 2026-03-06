const extraction = require('../utils/extraction');
const chunking = require('../utils/chunking');
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const embeddingService = require('./embeddingService');
const vectorService = require('./vectorService');

exports.processDocument = async (filePath, mimeType, userId, originalName = null) => {
  // 1. extract text
  const text = await extraction.extractText(filePath, mimeType);
  if (!text || !text.trim()) {
    throw new Error('No extractable text found in uploaded document');
  }
  // 2. save Document record
  const doc = new Document({
    userId,
    originalText: text,
    filename: originalName || filePath,
    contentType: mimeType
  });
  await doc.save();
  // 3. chunk text
  const chunks = chunking.chunkText(text, 900, 180);
  // 4. for each chunk store
  for (let i = 0; i < chunks.length; i++) {
    const startOffset = i * (900 - 180);
    const chunk = new Chunk({
      userId,
      documentId: doc._id,
      text: chunks[i],
      chunkIndex: i,
      startOffset,
      endOffset: startOffset + chunks[i].length
    });
    await chunk.save();
    const vec = await embeddingService.embedText(chunks[i]);
    chunk.embedding = vec;
    chunk.embeddingId = chunk._id.toString();
    await chunk.save();
    await vectorService.add(chunk._id.toString(), vec, {
      documentId: doc._id.toString(),
      text: chunks[i],
      index: i
    });
  }
  doc.processed = true;
  doc.chunkCount = chunks.length;
  await doc.save();
  return doc;
};
