const { body } = require('express-validator');
const moment = require('moment');

const ValidationNumberGraphApi = [
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
    body('province').notEmpty().withMessage('Please input province language thailand.')
];

module.exports = ValidationNumberGraphApi;
