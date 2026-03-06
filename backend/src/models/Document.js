const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: String,
  folder: { type: String, default: 'General' },
  storedFileName: String,
  contentType: String,
  originalText: String,
  processed: { type: Boolean, default: false },
  chunkCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
