const Document = require('../models/Document');
// placeholder for extraction, chunking etc.

const textService = require('../services/textService');

exports.uploadDocument = async (req, res) => {
  try {
    // Assume file is in req.file handled by multer
    const { path, mimetype } = req.file;
    const userId = req.body.userId; // or from auth middleware
    const doc = await textService.processDocument(path, mimetype, userId);
    res.json({ docId: doc._id, status: 'processed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDocument = async (req, res) => {
  const { id } = req.params;
  const doc = await Document.findById(id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
};
