function isResponseFinalized(res) {
  return Boolean(res.headersSent || res.writableEnded || res.destroyed);
}

function sendRateLimitError(res, status, code, message, details) {
  if (isResponseFinalized(res)) {
    return null;
  }

  return res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      details: details || null,
      requestId: res.getHeader("X-Request-Id") || null,
      timestamp: new Date().toISOString()
    }
  });
}

function readClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function createIpRateLimiter({
  windowMs = 60_000,
  max = 30,
  code = "RATE_LIMITED",
  message = "Too many requests. Please retry shortly.",
  keyPrefix = "global"
} = {}) {
  const counters = new Map();

  return function ipRateLimiter(req, res, next) {
    const now = Date.now();
    const clientIp = readClientIp(req);
    const key = `${keyPrefix}:${clientIp}`;
    const existing = counters.get(key);

    if (!existing || now > existing.resetAt) {
      counters.set(key, {
        count: 1,
        resetAt: now + windowMs
      });

      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - 1)));
      return next();
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000)
      );

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");

      return sendRateLimitError(res, 429, code, message, {
        windowMs,
        max
      });
    }

    existing.count += 1;
    counters.set(key, existing);

    if (counters.size > 1000) {
      for (const [bucketKey, bucketValue] of counters.entries()) {
        if (now > bucketValue.resetAt) {
          counters.delete(bucketKey);
        }
      }
    }

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - existing.count)));

    return next();
  };
}

module.exports = {
  createIpRateLimiter
};
