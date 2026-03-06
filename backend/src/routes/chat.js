const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { queryChat, generateSummary } = require('../controllers/chatController');

router.post('/query', auth, queryChat);
router.post('/summary', auth, generateSummary);

module.exports = router;
