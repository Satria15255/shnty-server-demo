const { createClient } = require("redis");

const redisClient = createClient({
	url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
	console.error("Redis error:", err.message);
});

redisClient.on("ready", () => {
	console.log("Redis READY");
});

const connectRedis = async () => {
	if (!redisClient.isOpen) {
		await redisClient.connect();

		await redisClient.set("zafaris:test", "Redis is working", {
			EX: 60,
		});

		const result = await redisClient.get("zafaris:test");

		console.log("Redis test:", result);
	}
};

module.exports = {
	redisClient,
	connectRedis,
};
