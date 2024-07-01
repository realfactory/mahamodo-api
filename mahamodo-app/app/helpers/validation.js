const { body, validationResult } = require("express-validator");
function validation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Extracting errors and formatting the response
    const formattedErrors = errors.array().map(error => ({
      code : error.path,
      details: error.msg,
    }));

    return res.status(422).send({
      status: 422,
      success: false,
      message: "Validation Error.",
      errors: formattedErrors,
    });
  }
    // MISSING_PARAMETERS
}

module.exports = {
  validation,
};
