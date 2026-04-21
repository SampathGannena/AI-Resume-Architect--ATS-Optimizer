const startedAt = Date.now();

const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  latencySamples: [],
  byRoute: new Map()
};

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function normalizeRoute(pathname) {
  return (pathname || "")
    .replace(/\/[0-9]+/g, "/:id")
    .replace(/\/[0-9a-fA-F-]{8,}/g, "/:id");
}

function requestTelemetry(req, res, next) {
  const reqStart = Date.now();
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const latencyMs = Date.now() - reqStart;
    const routeKey = `${req.method} ${normalizeRoute(req.path)}`;

    metrics.totalRequests += 1;
    if (res.statusCode >= 400) {
      metrics.totalErrors += 1;
    }

    metrics.latencySamples.push(latencyMs);
    if (metrics.latencySamples.length > 400) {
      metrics.latencySamples.shift();
    }

    const currentRoute = metrics.byRoute.get(routeKey) || {
      hits: 0,
      errors: 0,
      avgLatencyMs: 0,
      maxLatencyMs: 0
    };

    currentRoute.hits += 1;
    if (res.statusCode >= 400) {
      currentRoute.errors += 1;
    }
    currentRoute.maxLatencyMs = Math.max(currentRoute.maxLatencyMs, latencyMs);
    currentRoute.avgLatencyMs = Math.round(
      ((currentRoute.avgLatencyMs * (currentRoute.hits - 1)) + latencyMs) /
        currentRoute.hits
    );

    metrics.byRoute.set(routeKey, currentRoute);

    console.log(
      JSON.stringify({
        level: "info",
        event: "http_request",
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        latencyMs,
        timestamp: new Date().toISOString()
      })
    );
  });

  next();
}

function getMetricsSnapshot() {
  const routes = [...metrics.byRoute.entries()]
    .map(([route, data]) => ({ route, ...data }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 30);

  const latency = metrics.latencySamples;
  const avgLatencyMs = latency.length
    ? Math.round(latency.reduce((sum, value) => sum + value, 0) / latency.length)
    : 0;

  return {
    startedAt: new Date(startedAt).toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    errorRatePercent: metrics.totalRequests
      ? Number(((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(2))
      : 0,
    latencyMs: {
      avg: avgLatencyMs,
      p95: percentile(latency, 95),
      max: latency.length ? Math.max(...latency) : 0,
      sampleSize: latency.length
    },
    routes
  };
}

module.exports = {
  requestTelemetry,
  getMetricsSnapshot
};
