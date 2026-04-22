const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      trim: true,
      default: ""
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      default: "user"
    },
    status: {
      type: String,
      default: "active"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
