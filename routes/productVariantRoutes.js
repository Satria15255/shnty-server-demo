const express = require("express");

const {
	createVariant,
	getVariantsByProduct,
	getVariantById,
	updateVariant,
	deleteVariant,
	generateVariants,
} = require("../controllers/ProductVariantController");
const {
	authMiddleware,
	adminMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", createVariant);
router.get("/product/:productId", getVariantsByProduct);
router.get("/:id", getVariantById);
router.put("/:id", updateVariant);
router.delete("/:id", deleteVariant);

module.exports = router;
