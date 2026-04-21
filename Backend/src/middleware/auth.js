const {
  verifyAccessToken,
  getSafeUserById
} = require("../services/authService");

function sendAuthError(res, code, message, details) {
  return res.status(401).json({
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

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendAuthError(res, "AUTH_REQUIRED", "Authentication token is required.");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return sendAuthError(res, "AUTH_REQUIRED", "Authentication token is required.");
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      return sendAuthError(res, "AUTH_INVALID", "Authentication token is invalid or expired.", {
        reason: error?.message || "Token verification failed"
      });
    }

    const user = await getSafeUserById(payload?.sub);
    if (!user) {
      return sendAuthError(res, "AUTH_USER_NOT_FOUND", "Authenticated user no longer exists.");
    }

    req.user = user;
    req.auth = {
      tokenPayload: payload
    };

    return next();
  } catch (error) {
    return sendAuthError(res, "AUTH_CHECK_FAILED", "Authentication could not be verified.", {
      reason: error?.message || "Unknown authentication error"
    });
  }
}

module.exports = {
  requireAuth
};
