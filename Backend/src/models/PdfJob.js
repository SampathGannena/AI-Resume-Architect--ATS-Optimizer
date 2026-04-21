const mongoose = require("mongoose");

const pdfJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
      index: true
    },
    resumeData: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    templateId: {
      type: String,
      default: "classic"
    },
    templateLayout: {
      type: String,
      default: "classic"
    },
    templateMetaTemplateId: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued"
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    failedAt: {
      type: Date,
      default: null
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PdfAsset",
      default: null
    },
    error: {
      type: String,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

pdfJobSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.PdfJob || mongoose.model("PdfJob", pdfJobSchema);
