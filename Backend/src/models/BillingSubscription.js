const mongoose = require("mongoose");

const billingSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free"
    },
    status: {
      type: String,
      default: "active"
    },
    stripeCustomerId: {
      type: String,
      default: null,
      index: true,
      sparse: true
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
      index: true,
      sparse: true
    },
    source: {
      type: String,
      default: "system"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports =
  mongoose.models.BillingSubscription ||
  mongoose.model("BillingSubscription", billingSubscriptionSchema);
