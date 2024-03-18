const express = require('express');
const router = express.Router();
const ageController = require('../controllers/ageController');
const birthHoroscopeController = require('../controllers/birthHoroscopeController');


router.get("/age", (req, res) => {
    res.render('index', {
        appName: 'Mahamodo Calculate Age'
    });
});

router.get('/calculate-age', ageController.calculateAge);


// router.get("/birth-horoscope", (req, res) => {
//     res.render('birth_horoscope', {
//         appName: 'Mahamodo Put Date'
//     });
// });

router.get('/birth-horoscope', birthHoroscopeController.putDate);

module.exports = router;