const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/authMiddleware');

router.post('/query', auth, chatController.queryChat);
router.post('/summary', auth, chatController.generateSummary);

module.exports = router;
