function isResponseFinalized(res) {
  return Boolean(res.headersSent || res.writableEnded || res.destroyed);
}

function sendError(res, status, code, message, details) {
  if (isResponseFinalized(res)) {
    return null;
  }

  return res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      details: details || null,
      timestamp: new Date().toISOString()
    }
  });
}

function createAiRateLimiter({ windowMs = 60_000, max = 30 } = {}) {
  const counters = new Map();

  return function aiRateLimiter(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const existing = counters.get(key);

    if (!existing || now > existing.resetAt) {
      counters.set(key, { count: 1, resetAt: now + windowMs });
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

      return sendError(
        res,
        429,
        "RATE_LIMITED",
        "Too many AI requests. Please retry shortly.",
        {
          windowMs,
          max
        }
      );
    }

    existing.count += 1;
    counters.set(key, existing);

    if (counters.size > 500) {
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

function createTimeoutGuard({ timeoutMs = 1_800, message } = {}) {
  return function aiTimeoutGuard(req, res, next) {
    req.aiTimeoutReached = false;

    const timer = setTimeout(() => {
      if (isResponseFinalized(res)) return;

      req.aiTimeoutReached = true;

      sendError(
        res,
        504,
        "AI_TIMEOUT",
        message || "AI processing timed out. Please retry.",
        {
          timeoutMs
        }
      );
    }, timeoutMs);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));

    next();
  };
}

module.exports = {
  createAiRateLimiter,
  createTimeoutGuard
};
