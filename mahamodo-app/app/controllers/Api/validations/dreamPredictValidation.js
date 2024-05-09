const { body } = require('express-validator');

const ValidationDreamPredictApi = [
    body('dream').notEmpty().withMessage('Please input dream'),
];

module.exports = ValidationDreamPredictApi;
