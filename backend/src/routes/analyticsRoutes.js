const express = require('express');
const auth = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.get('/', auth, analyticsController.getAnalytics);
router.post('/increment', auth, analyticsController.incrementAnalytics);

module.exports = router;
