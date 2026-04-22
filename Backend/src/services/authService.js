const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function ensureStrongPassword(password) {
  const normalized = String(password || "");
  if (normalized.length < 8) {
    return {
      ok: false,
      code: "WEAK_PASSWORD",
      message: "Password must be at least 8 characters long."
    };
  }

  return { ok: true };
}

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET_MISSING_OR_WEAK");
  }

  return secret;
}

function sanitizeUser(user) {
  if (!user) return null;

  const source = typeof user.toObject === "function" ? user.toObject() : user;
  return {
    id: String(source._id),
    email: source.email,
    name: source.name || "",
    role: source.role || "user",
    status: source.status || "active",
    createdAt: source.createdAt ? new Date(source.createdAt).toISOString() : null,
    updatedAt: source.updatedAt ? new Date(source.updatedAt).toISOString() : null
  };
}

function createAccessToken(user) {
  const safeUser = sanitizeUser(user);
  if (!safeUser?.id) {
    throw new Error("INVALID_USER_FOR_TOKEN");
  }

  return jwt.sign(
    {
      sub: safeUser.id,
      email: safeUser.email,
      role: safeUser.role
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "12h",
      issuer: "careerforge-pro"
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "careerforge-pro"
  });
}

async function getSafeUserById(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    return null;
  }

  const user = await User.findById(userId).lean();
  if (!user || user.status !== "active") {
    return null;
  }

  return sanitizeUser(user);
}

async function registerUser({ email, password, name }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return {
      ok: false,
      status: 400,
      code: "EMAIL_REQUIRED",
      message: "Email is required."
    };
  }

  const passwordCheck = ensureStrongPassword(password);
  if (!passwordCheck.ok) {
    return {
      ok: false,
      status: 400,
      code: passwordCheck.code,
      message: passwordCheck.message
    };
  }

  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    return {
      ok: false,
      status: 409,
      code: "EMAIL_ALREADY_REGISTERED",
      message: "An account with this email already exists."
    };
  }

  const hashedPassword = await bcrypt.hash(String(password), 12);
  const user = await User.create({
    email: normalizedEmail,
    name: String(name || "").trim(),
    passwordHash: hashedPassword,
    role: "user",
    status: "active"
  });

  const token = createAccessToken(user);
  return {
    ok: true,
    token,
    user: sanitizeUser(user)
  };
}

async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_CREDENTIALS",
      message: "Email and password are required."
    };
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
  if (!user || user.status !== "active") {
    return {
      ok: false,
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password."
    };
  }

  const validPassword = await bcrypt.compare(String(password), user.passwordHash);
  if (!validPassword) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password."
    };
  }

  const token = createAccessToken(user);
  return {
    ok: true,
    token,
    user: sanitizeUser(user)
  };
}

module.exports = {
  registerUser,
  loginUser,
  verifyAccessToken,
  getSafeUserById,
  sanitizeUser
};
