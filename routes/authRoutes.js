const express = require("express");
const router = express.Router();
const {
	authMiddleware,
	adminMiddleware,
} = require("../middleware/authMiddleware");
const {
	registerUser,
	loginUser,
	getUserProfile,
	updateProfile,
	updatePassword,
	addUserAddress,
	updateUserAddress,
	deleteUserAddress,
	setDefaultAddress,
} = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.get("/users/profile", authMiddleware, getUserProfile);
router.post("/users/address", authMiddleware, addUserAddress);
router.patch("/users/address/:addressId", authMiddleware, updateUserAddress);
router.delete("/users/address/:addressId", authMiddleware, deleteUserAddress);
router.patch(
	"/users/address/:addressId/default",
	authMiddleware,
	setDefaultAddress,
);
router.patch("/users/profile", authMiddleware, updateProfile);
router.put("/users/change-password", authMiddleware, updatePassword);
module.exports = router;
