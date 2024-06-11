const express = require('express');
const router = express.Router();
const payakornController = require('../controllers/Api/payakorn.controller.js');

// Import validations
const ValidationSomPutDateApi = require('../controllers/Api/validations/sompudLukValidation');
const ValidationDreamPredictApi = require('../controllers/Api/validations/dreamPredictValidation');
const ValidationNumberGraphApi = require('../controllers/Api/validations/numberGraphValidation');

router.get('/payakorn/:table?/:id?', payakornController.findDataInTable);
router.post('/payakorn', payakornController.updateDataInTable);
router.post('/payakorn/dream/predict/', ValidationDreamPredictApi, payakornController.DreamPredict);
router.post('/payakorn/sompudluk', ValidationSomPutDateApi, payakornController.SompudLuk);
router.post('/payakorn/graphlife', ValidationNumberGraphApi, payakornController.graphlife);

module.exports = router;