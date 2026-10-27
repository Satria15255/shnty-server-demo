const { redisClient } = require("../config/redis");

const CACHE_PREFIX = process.env.CACHE_PREFIX || "development";

const cacheResponse = (namespace, ttl = 300) => {
	return async (req, res, next) => {
		if (!redisClient.isReady) {
			res.setHeader("X-Cache", "BYPASS");
			return next();
		}

		try {
			const versionKey = `${CACHE_PREFIX}:cache:${namespace}:version`;

			const version = (await redisClient.get(versionKey)) || "0";

			const cacheKey = `${CACHE_PREFIX}:cache:${namespace}:v${version}:${req.originalUrl}`;

			const cachedData = await redisClient.get(cacheKey);

			if (cachedData) {
				res.setHeader("X-Cache", "HIT");

				return res.status(200).json(JSON.parse(cachedData));
			}

			res.setHeader("X-Cache", "MISS");

			const originalJson = res.json.bind(res);

			res.json = (body) => {
				if (
					res.statusCode >= 200 &&
					res.statusCode < 300 &&
					redisClient.isReady
				) {
					redisClient
						.set(cacheKey, JSON.stringify(body), {
							EX: ttl,
						})
						.catch((err) => {
							console.error(
								"Redis cache set error:",
								err.message,
							);
						});
				}

				return originalJson(body);
			};

			next();
		} catch (error) {
			console.error("Redis cache error:", error.message);

			next();
		}
	};
};

const invalidateCache = async (namespace) => {
	if (!redisClient.isReady) {
		return;
	}

	try {
		await redisClient.incr(`${CACHE_PREFIX}:cache:${namespace}:version`);
	} catch (error) {
		console.error("Redis invalidation error:", error.message);
	}
};

module.exports = {
	cacheResponse,
	invalidateCache,
};
