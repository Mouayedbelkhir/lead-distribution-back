const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/authorize.middleware");
const verticalController = require("../controllers/vertical.controller");

router.get("/", authenticate, verticalController.list);
router.get("/:id", authenticate, verticalController.getById);
router.post("/", authenticate, authorize("ADMIN"), verticalController.create);
router.put("/:id", authenticate, authorize("ADMIN"), verticalController.update);
router.delete("/:id", authenticate, authorize("ADMIN"), verticalController.remove);

module.exports = router;
