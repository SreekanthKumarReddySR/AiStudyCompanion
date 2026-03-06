const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  text: String,
  chunkIndex: Number,
  startOffset: Number,
  endOffset: Number,
  embeddingId: String,
  embedding: { type: [Number], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Chunk', chunkSchema);
