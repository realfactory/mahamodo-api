const { body } = require('express-validator');
const moment = require('moment');

const ValidationSomPutDateApi = [
    body('birth_day').notEmpty().withMessage('Please input birthday')
    .custom(value => {
        const formattedDate = moment(value, 'YYYY-MM-DD', true);
        if (!formattedDate.isValid()) {
            throw new Error('Birthday must be in YYYY-MM-DD format');
        }
        return true;
    }),
    body('birth_hour').notEmpty().withMessage('Please input birth hour')
    .isInt({
        min: 0,
        max: 23
    }).withMessage('Birth hour must be between 0 and 23'),
    body('birth_minute').notEmpty().withMessage('Please input birth minute')
    .isInt({
        min: 0,
        max: 59
    }).withMessage('Birth minute must be between 0 and 59'),
    body('province').notEmpty().withMessage('Please input province language thailand.'),
    body('current_date').custom((value, { req }) => {
        if (value === undefined || value.trim() === '') {
            req.body.current_date = moment().format('YYYY-MM-DD');
        } else {
            const formattedDate = moment(value, 'YYYY-MM-DD', true);
            if (!formattedDate.isValid()) {
                throw new Error('current_date must be in YYYY-MM-DD format');
            }
        }
        return true;
    }),
    body('current_hour').custom((value, {
        req
    }) => {
        if (value === undefined) {
            req.body.current_hour = moment().format('HH');
        } else {
            const hour = parseInt(value, 10);
            if (isNaN(hour) || hour < 0 || hour > 23) {
                throw new Error('current_hour must be between 0 and 23');
            }
        }
        return true;
    }),
    body('current_minute').custom((value, {
        req
    }) => {
        if (value === undefined) {
            req.body.current_minute = moment().format('mm');
        } else {
            const minute = parseInt(value, 10);
            if (isNaN(minute) || minute < 0 || minute > 59) {
                throw new Error('current_minute must be between 0 and 59');
            }
        }
        return true;
    })
];

module.exports = ValidationSomPutDateApi;
