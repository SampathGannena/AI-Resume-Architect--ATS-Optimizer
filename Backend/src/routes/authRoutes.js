const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  registerUser,
  loginUser
} = require("../services/authService");
const { createIpRateLimiter } = require("../middleware/rateGuards");

const router = express.Router();
const authRateLimiter = createIpRateLimiter({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 25),
  code: "AUTH_RATE_LIMITED",
  message: "Too many authentication attempts. Please retry shortly.",
  keyPrefix: "auth"
});

function sendOk(res, payload = {}, status = 200) {
  return res.status(status).json({
    ok: true,
    ...payload
  });
}

function sendError(res, status, code, message, details) {
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

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      return sendError(res, 500, "AUTH_ROUTE_ERROR", "Unexpected authentication error.", {
        reason: error?.message || "Unknown error"
      });
    }
  };
}

router.post("/auth/register", authRateLimiter, asyncRoute(async (req, res) => {
  const result = await registerUser({
    email: req.body?.email,
    password: req.body?.password,
    name: req.body?.name
  });

  if (!result.ok) {
    return sendError(res, result.status || 400, result.code || "REGISTER_FAILED", result.message || "Registration failed");
  }

  return sendOk(res, {
    token: result.token,
    user: result.user
  }, 201);
}));

router.post("/auth/login", authRateLimiter, asyncRoute(async (req, res) => {
  const result = await loginUser({
    email: req.body?.email,
    password: req.body?.password
  });

  if (!result.ok) {
    return sendError(res, result.status || 401, result.code || "LOGIN_FAILED", result.message || "Login failed");
  }

  return sendOk(res, {
    token: result.token,
    user: result.user
  });
}));

router.get("/auth/me", requireAuth, (req, res) => {
  return sendOk(res, {
    user: req.user
  });
});

module.exports = router;
