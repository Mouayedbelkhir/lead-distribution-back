const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const dashboardController = require("../controllers/dashboard.controller");

router.get("/stats", authenticate, dashboardController.getStats);

module.exports = router;
