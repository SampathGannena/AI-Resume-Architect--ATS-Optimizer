require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const {
  requestTelemetry,
  getMetricsSnapshot
} = require("./middleware/requestTelemetry");
const { connectDatabase } = require("./config/database");
const {
  validateRuntimeConfig,
  isPdfPipelineEnabled
} = require("./config/runtimeConfig");
const { startPdfQueueWorker } = require("./services/pdfJobService");

const app = express();
const port = process.env.PORT || 3000;
const defaultCorsOrigins = ["http://localhost:5173", "http://localhost:5174"];
const configuredCorsOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedCorsOrigins = configuredCorsOrigins.length
  ? configuredCorsOrigins
  : defaultCorsOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedCorsOrigins.includes("*") ||
        allowedCorsOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true
  })
);
app.use(express.json({
  limit: "2mb",
  verify: (req, _, buffer) => {
    req.rawBody = buffer;
  }
}));
app.use(requestTelemetry);

app.get("/api/metrics", (_, res) => {
  res.json({
    ok: true,
    metrics: getMetricsSnapshot()
  });
});

app.use("/api", authRoutes);
app.use("/api", resumeRoutes);

function shouldRunInlinePdfWorker() {
  if (!isPdfPipelineEnabled()) {
    return false;
  }

  const value = String(process.env.PDF_WORKER_INLINE || "").trim().toLowerCase();
  return value === "true" || value === "1";
}

async function startServer() {
  validateRuntimeConfig();
  await connectDatabase();

  if (shouldRunInlinePdfWorker()) {
    startPdfQueueWorker().catch((error) => {
      console.error("Inline PDF worker failed", error);
    });
  }

  app.listen(port, () => {
    console.log(`CareerForge Pro backend running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend server", error);
  process.exit(1);
});
