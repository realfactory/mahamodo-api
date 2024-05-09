const express = require('express');
const router = express.Router();
const birthHoroscopeController = require('../controllers/birthHoroscopeController');

router.get('/birth-horoscope', birthHoroscopeController.putDate);

module.exports = router;