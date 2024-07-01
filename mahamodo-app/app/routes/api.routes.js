const express = require("express");
const router = express.Router();
const payakornController = require("../controllers/Api/payakorn.controller");
const managementData = require("../controllers/Api/management.data.controller");
const managementDataJson = require("../controllers/Api/management.data.json.controller");

// Import validations
const ValidationDreamPredictApi = require("../controllers/Api/validations/dreamPredictValidation");
const ValidationSomPutDateApi = require("../controllers/Api/validations/sompudLukValidation");
const ValidationNumberGraphApi = require("../controllers/Api/validations/numberGraphValidation");

router.get("/payakorn/:table?/:id?", managementData.findDataInTable);
router.post("/payakorn", managementData.updateDataInTable);

router.post(
  "/payakorn/dream/predict/",
  ValidationDreamPredictApi,
  payakornController.DreamPredict
);
router.post(
  "/payakorn/sompudluk",
  ValidationSomPutDateApi,
  payakornController.SompudLuk
);

router.get("/management/graphlife", managementDataJson.finDataJsonGraphLife);
router.post(
  "/management/graphlife/update",
  managementDataJson.updateDataInJsonGraphLife
);

router.post(
  "/payakorn/graphlife",
  ValidationSomPutDateApi,
  payakornController.graphlife
);

module.exports = router;