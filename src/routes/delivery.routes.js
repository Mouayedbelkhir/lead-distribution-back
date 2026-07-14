const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/authorize.middleware");
const deliveryController = require("../controllers/delivery.controller");

router.get("/", authenticate, deliveryController.list);
router.get("/:id", authenticate, deliveryController.getById);
router.post("/", authenticate, authorize("ADMIN"), deliveryController.create);
router.put("/:id", authenticate, authorize("ADMIN"), deliveryController.update);
router.delete("/:id", authenticate, authorize("ADMIN"), deliveryController.remove);

module.exports = router;
