const helpers = require('../helpers/helpers');

exports.calculateAge = (req, res) => {
    
    let Ages = '';
    let Sign = '';

    Ages = helpers.calculateAges(req);
    Sign = helpers.getRandomZodiacSign();
    DayTh = helpers.fcDayi17ToS(2);
    fcNoEToTh = helpers.fcNoEToTh(1235511);
    
    res.send({
        age: `Your age is ${Ages} years`,
        zodiacSign: `Your random zodiac sign is ${Sign}`,
        DayTh: `${DayTh}`,
        fcNoEToTh: `${fcNoEToTh}`
    });


    // helpers.calculateAges(req, (err, resultAges) => {
    //     if (err) {
    //         return res.status(500).send({
    //             status: 500,
    //             message: `Error calculating age: ${err.message}`
    //         });
    //     }
    // });

    // helpers.getRandomZodiacSign(req, (err, resultSign) => {
    //     if (err) {
    //         return res.status(500).send({
    //             status: 500,
    //             message: `Error calculating zodiac sign: ${err.message}`
    //         });
    //     }

    //     res.send({
    //         age: `Your age is ${resultAges} years`,
    //         zodiacSign: `Your random zodiac sign is ${resultSign}`
    //     });

    // });
    
};