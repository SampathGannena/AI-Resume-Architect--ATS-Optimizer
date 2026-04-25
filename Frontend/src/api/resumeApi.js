const API_BASE = import.meta.env.VITE_API_BASE_URL;
const TOKEN_KEY = "careerforge.accessToken";

export function getAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setAccessToken(token) {
  if (typeof window === "undefined") return;
  if (!token) return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest(path, { method = "GET", body, formData, auth = true } = {}) {
  const headers = {};

  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const options = {
    method,
    headers
  };

  if (typeof formData !== "undefined") {
    options.body = formData;
  } else if (typeof body !== "undefined") {
    options.body = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  const payload = await safeJson(response);

  if (typeof payload?.ok === "boolean") {
    if (!payload.ok) {
      if (response.status === 401 && auth) {
        clearAccessToken();
      }

      return {
        ...payload,
        status: response.status
      };
    }

    return payload;
  }

  if (response.ok) {
    return {
      ok: true,
      ...payload
    };
  }

  if (response.status === 401 && auth) {
    clearAccessToken();
  }

  return {
    ok: false,
    status: response.status,
    error: payload?.error || {
      code: "REQUEST_FAILED",
      message: `Request failed with status ${response.status}`
    }
  };
}

async function safeJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (response.status === 204 || !contentType.includes("application/json")) {
    return {};
  }

  try {
    return await response.json();
  } catch {
    return {
      ok: false,
      error: {
        code: "INVALID_JSON_RESPONSE",
        message: "Received invalid JSON response from API"
      }
    };
  }
}

export async function registerAccount({ name, email, password }) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: {
      name,
      email,
      password
    },
    auth: false
  });
}

export async function loginAccount({ email, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: {
      email,
      password
    },
    auth: false
  });
}

export async function getCurrentUser() {
  return apiRequest("/auth/me");
}

export async function createResume(payload) {
  return apiRequest("/resumes", {
    method: "POST",
    body: payload || {}
  });
}

export async function getResume(id) {
  return apiRequest(`/resumes/${id}`);
}

export async function updateResume(id, payload) {
  return apiRequest(`/resumes/${id}`, {
    method: "PUT",
    body: payload
  });
}

export async function importResumeFromPdf(file) {
  const formData = new FormData();
  formData.append("resumePdf", file);

  return apiRequest("/resumes/import-pdf", {
    method: "POST",
    formData
  });
}

export async function analyzeResumeMatch({ resumeId, resumeData, jobDescription }) {
  return apiRequest("/resumes/analyze", {
    method: "POST",
    body: { resumeId, resumeData, jobDescription }
  });
}

export async function getResumeAnalysisHistory(resumeId) {
  return apiRequest(`/resumes/${resumeId}/analysis-history`);
}

export async function getResumeRewriteHistory(resumeId) {
  return apiRequest(`/resumes/${resumeId}/rewrite-history`);
}

export async function getResumeVersionHistory(resumeId) {
  return apiRequest(`/resumes/${resumeId}/version-history`);
}

export async function getDashboardSummary(limit) {
  const safeLimit = Number.isFinite(Number(limit))
    ? `?limit=${Math.max(1, Math.trunc(Number(limit)))}`
    : "";

  return apiRequest(`/dashboard/summary${safeLimit}`);
}

export async function getDashboardResumes(limit) {
  const safeLimit = Number.isFinite(Number(limit))
    ? `?limit=${Math.max(1, Math.trunc(Number(limit)))}`
    : "";

  return apiRequest(`/dashboard/resumes${safeLimit}`);
}

export async function getResumeIterationTimeline(resumeId, limit) {
  const safeLimit = Number.isFinite(Number(limit))
    ? `?limit=${Math.max(1, Math.trunc(Number(limit)))}`
    : "";

  return apiRequest(`/dashboard/resumes/${resumeId}/iterations${safeLimit}`);
}

export async function extractJdKeywords(jobDescription) {
  return apiRequest("/jd/keywords", {
    method: "POST",
    body: { jobDescription }
  });
}

export async function rewriteExperienceBullet({
  resumeId,
  bulletIndex,
  bulletPoint,
  keyword,
  jobDescription
}) {
  return apiRequest("/ai/rewrite-bullet", {
    method: "POST",
    body: {
      resumeId,
      bulletIndex,
      bulletPoint,
      keyword,
      jobDescription
    }
  });
}

export async function rewriteResumeBulletsBatch({
  resumeId,
  bullets,
  keywords,
  jobDescription
}) {
  return apiRequest("/ai/rewrite-batch", {
    method: "POST",
    body: {
      resumeId,
      bullets,
      keywords,
      jobDescription
    }
  });
}

export async function rewriteExperienceBulletsBatch(payload) {
  return rewriteResumeBulletsBatch(payload);
}

export async function getCoverLetterProfiles() {
  return apiRequest("/cover-letter/profiles");
}

export async function generateCoverLetter(payload) {
  return apiRequest("/cover-letter/generate", {
    method: "POST",
    body: payload || {}
  });
}

export async function createPdfJob({
  resumeId,
  templateId,
  templateLayout,
  templateMetaTemplateId
}) {
  return apiRequest("/pdf/jobs", {
    method: "POST",
    body: {
      resumeId,
      templateId,
      templateLayout,
      templateMetaTemplateId
    }
  });
}

export async function getPdfJob(jobId) {
  return apiRequest(`/pdf/jobs/${jobId}`);
}

export async function getLatestResumePdf(resumeId) {
  return apiRequest(`/resumes/${resumeId}/pdf/latest`);
}

export async function getBillingEntitlements() {
  return apiRequest("/billing/entitlements");
}

export async function createBillingCheckout({ email, successUrl, cancelUrl }) {
  return apiRequest("/billing/checkout", {
    method: "POST",
    body: {
      email,
      successUrl,
      cancelUrl
    }
  });
}

export async function simulateBillingSuccess() {
  return apiRequest("/billing/mock-success", {
    method: "POST"
  });
}
