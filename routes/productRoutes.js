const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getLatestProducts,
  getBestSellerProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");
const {
  getDailyDiscounts,
  createDailyDiscount,
} = require("../controllers/discountController");
const upload = require("../utils/storage");
const { cacheResponse } = require("../middleware/cache");

router.get("/", cacheResponse("products", 300), getAllProducts);
router.get("/latest", cacheResponse("products", 300), getLatestProducts);
router.get(
  "/best-seller",
  cacheResponse("products", 300),
  getBestSellerProducts,
);
router.get(
  "/discounts/today",
  cacheResponse("products", 300),
  getDailyDiscounts,
);
router.get("/discounts/generate", createDailyDiscount);
router.get("/:id", cacheResponse("products", 300), getProductById);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  updateProduct,
);
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  createProduct,
);
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

router.post("/generate-discount", async (req, res) => {
  await createDailyDiscount();
  res.send("Diskon di-generate");
});

module.exports = router;
