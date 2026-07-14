const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const leadController = require("../controllers/lead.controller");

router.get("/", authenticate, leadController.list);
router.post("/", authenticate, leadController.create);
router.post("/simulate", authenticate, leadController.simulate);

module.exports = router;
