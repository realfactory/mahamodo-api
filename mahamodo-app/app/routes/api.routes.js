const express = require('express');
const router = express.Router();

// Import your user controller
const dreamController = require('../controllers/dream.controller');
const LuktamnaikalakiniinpopController = require('../controllers/luktamnaikalakiniinpop.controller');

// Define routes
router.get('/dream/list', dreamController.findAll);
router.post('/dream/predict', dreamController.Predict);

router.get('/luktamnaikalakiniinpop/list', LuktamnaikalakiniinpopController.findAll);
router.post('/luktamnaikalakiniinpop/update', LuktamnaikalakiniinpopController.update);

module.exports = router;