const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/authorize.middleware");
const clientController = require("../controllers/client.controller");

router.get("/", authenticate, clientController.list);
router.get("/:id", authenticate, clientController.getById);
router.post("/", authenticate, authorize("ADMIN"), clientController.create);
router.put("/:id", authenticate, authorize("ADMIN"), clientController.update);
router.delete("/:id", authenticate, authorize("ADMIN"), clientController.remove);

module.exports = router;
