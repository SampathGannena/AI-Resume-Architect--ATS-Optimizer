const mongoose = require("mongoose");

const pdfAssetSchema = new mongoose.Schema(
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
    type: {
      type: String,
      default: "pdf"
    },
    filePath: {
      type: String,
      default: null
    },
    storageProvider: {
      type: String,
      default: "s3"
    },
    storageBucket: {
      type: String,
      default: null
    },
    storageKey: {
      type: String,
      default: null
    },
    contentType: {
      type: String,
      default: "application/pdf"
    },
    byteSize: {
      type: Number,
      default: 0
    },
    checksumSha256: {
      type: String,
      default: null
    },
    renderMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

pdfAssetSchema.index({ userId: 1, resumeId: 1, createdAt: -1 });

module.exports = mongoose.models.PdfAsset || mongoose.model("PdfAsset", pdfAssetSchema);
