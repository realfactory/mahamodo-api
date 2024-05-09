const {
    body,
    validationResult
} = require('express-validator');
function validation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 400,
            errors: errors.array()
        });
    }
}

module.exports = {
    validation,
}