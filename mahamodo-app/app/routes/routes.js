const express = require('express');
const router = express.Router();
const birthHoroscopeController = require('../controllers/birthHoroscopeController');

router.get('/birth-horoscope', birthHoroscopeController.putDateForm);
router.get('/birth-horoscope/post', birthHoroscopeController.putDate);

module.exports = router;