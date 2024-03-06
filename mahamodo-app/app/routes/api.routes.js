const express = require('express');
const router = express.Router();

// Import your user controller
const dreamController = require('../controllers/dream.controller');
const LuktamnaikalakiniinpopController = require('../controllers/luktamnaikalakiniinpop.controller');
const payakornController = require('../controllers/payakorn.controller');


// Define routes
router.get('/dream/list', dreamController.findAll);
router.post('/dream/predict', dreamController.Predict);

router.get('/luktamnaikalakiniinpop/list', LuktamnaikalakiniinpopController.findAll);
router.post('/luktamnaikalakiniinpop/update', LuktamnaikalakiniinpopController.update);

router.get('/payakorn/:table?/:id?', payakornController.findAll);
router.post('/payakorn', payakornController.update);

module.exports = router;