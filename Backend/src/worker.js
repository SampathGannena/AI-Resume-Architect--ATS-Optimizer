require("dotenv").config();

const { connectDatabase } = require("./config/database");
const { validateRuntimeConfig } = require("./config/runtimeConfig");
const { startPdfQueueWorker } = require("./services/pdfJobService");

async function startWorker() {
  validateRuntimeConfig();
  await connectDatabase();

  console.log("CareerForge Pro PDF worker started");
  await startPdfQueueWorker();
}

startWorker().catch((error) => {
  console.error("Failed to start PDF worker", error);
  process.exit(1);
});
