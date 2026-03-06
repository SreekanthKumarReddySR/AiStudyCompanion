const express = require('express');
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const router = express.Router();
const { uploadDocument, getDocument } = require('../controllers/documentController');

const upload = multer({ dest: 'uploads/' });

router.post('/upload', auth, upload.single('file'), uploadDocument);
router.get('/:id', auth, getDocument);

module.exports = router;
