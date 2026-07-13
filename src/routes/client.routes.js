const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const clientController = require("../controllers/client.controller");

router.get("/", authenticate, clientController.list);
router.get("/:id", authenticate, clientController.getById);
router.post("/", authenticate, clientController.create);
router.put("/:id", authenticate, clientController.update);
router.delete("/:id", authenticate, clientController.remove);

module.exports = router;
