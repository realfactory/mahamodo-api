const { body } = require('express-validator');
const moment = require('moment');

const ValidationSomPutDateApi = [
    body('date_of_birth').notEmpty().withMessage('Please input birthday')
    .custom(value => {
        const formattedDate = moment(value, 'YYYY-MM-DD', true);
        if (!formattedDate.isValid()) {
            throw new Error('Birthday must be in YYYY-MM-DD format');
        }
        return true;
    }),
    body('time_of_birth').custom((value, { req }) => {
        if (value === undefined || value.trim() === '') {
            throw new Error('Please input date_of_time');
        }
        const formattedTime = moment(value, 'HH:mm', true);
        if (!formattedTime.isValid()) {
            throw new Error('date_of_time must be in HH:mm format');
        }
        return true;
    }),
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
