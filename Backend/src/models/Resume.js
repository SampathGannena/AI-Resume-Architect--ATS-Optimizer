const mongoose = require("mongoose");

const versionHistorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    version: { type: Number, required: true },
    createdAt: { type: Date, required: true },
    changeSummary: { type: String, default: "" },
    createdBy: { type: String, default: "system" },
    dataSnapshot: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const analysisHistorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    createdAt: { type: Date, required: true },
    score: { type: Number, default: 0 },
    rawScore: { type: Number, default: 0 },
    matchedCount: { type: Number, default: 0 },
    missingCount: { type: Number, default: 0 },
    sectionBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    jobDescriptionPreview: { type: String, default: "" },
    deltaFromPreviousScore: { type: Number, default: null }
  },
  { _id: false }
);

const rewriteHistorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    createdAt: { type: Date, required: true },
    sourceBullet: { type: String, default: "" },
    rewrittenBullet: { type: String, default: "" },
    bulletIndex: { type: Number, default: null },
    keyword: { type: String, default: null },
    jobDescriptionPreview: { type: String, default: "" },
    latencyMs: { type: Number, default: 0 },
    qualityScore: { type: Number, default: 0 },
    verdict: { type: String, default: "unknown" },
    keywordIncluded: { type: Boolean, default: false }
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    currentVersion: {
      type: Number,
      default: 1
    },
    versionHistory: {
      type: [versionHistorySchema],
      default: []
    },
    analysisHistory: {
      type: [analysisHistorySchema],
      default: []
    },
    rewriteHistory: {
      type: [rewriteHistorySchema],
      default: []
    },
    metadata: {
      createdAt: { type: Date, required: true },
      updatedAt: { type: Date, required: true }
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

resumeSchema.index({ userId: 1, "metadata.updatedAt": -1 });

module.exports = mongoose.models.Resume || mongoose.model("Resume", resumeSchema);
