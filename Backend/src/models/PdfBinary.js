const mongoose = require("mongoose");

const pdfBinarySchema = new mongoose.Schema(
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
    storageKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    storageBucket: {
      type: String,
      default: null
    },
    contentType: {
      type: String,
      default: "application/pdf"
    },
    byteSize: {
      type: Number,
      required: true
    },
    checksumSha256: {
      type: String,
      default: null
    },
    data: {
      type: Buffer,
      required: true
    },
    sourceProvider: {
      type: String,
      default: "mongo"
    },
    mirroredFromS3: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

pdfBinarySchema.index({ userId: 1, resumeId: 1, createdAt: -1 });

module.exports = mongoose.models.PdfBinary || mongoose.model("PdfBinary", pdfBinarySchema);
