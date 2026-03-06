const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const docController = require('../controllers/docController');
const auth = require('../middleware/authMiddleware');

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir
});

router.post('/upload', auth, upload.single('file'), docController.uploadDocument);
router.get('/', auth, docController.listDocuments);
router.get('/:docId', auth, docController.getDocument);
router.get('/:docId/chunks', auth, docController.getChunks);
router.delete('/:docId', auth, docController.deleteDocument);

module.exports = router;
