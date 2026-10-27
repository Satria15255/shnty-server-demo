const { rateLimit } = require("express-rate-limit");

const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 300,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	message: {
		success: false,
		message: "To many request to globalLimiter, please try again later",
	},
});

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	skipSuccessfulRequests: true,
	message: {
		success: false,
		message: "To many login attempts, Please try again later.",
	},
});

const sensitiveLimiter = rateLimit({
	windowMs: 60 * 1000,
	limit: 10,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	message: {
		success: false,
		message: "To many request,Please wait before trying again sen",
	},
});

module.exports = {
	globalLimiter,
	authLimiter,
	sensitiveLimiter,
};
