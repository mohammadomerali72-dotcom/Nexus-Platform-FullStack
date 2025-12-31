const express = require('express');
const router = express.Router();
const { processPayment, getHistory } = require('../controllers/paymentController');

router.post('/pay', processPayment);
router.get('/history/:userId', getHistory);

module.exports = router;