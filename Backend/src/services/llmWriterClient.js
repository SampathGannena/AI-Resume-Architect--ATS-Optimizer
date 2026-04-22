function getGroqConfig() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const baseUrl = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 9_000);

  return {
    apiKey,
    baseUrl,
    model,
    timeoutMs
  };
}

function extractResponseText(payload) {
  if (!payload) return "";

  if (Array.isArray(payload.choices) && payload.choices.length) {
    const firstWithText = payload.choices.find((choice) => {
      const content = choice?.message?.content;
      return typeof content === "string" && content.trim();
    });

    if (firstWithText?.message?.content) {
      return firstWithText.message.content.trim();
    }
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  const textChunks = [];
  payload.output.forEach((item) => {
    if (!Array.isArray(item?.content)) {
      return;
    }

    item.content.forEach((contentItem) => {
      if (typeof contentItem?.text === "string" && contentItem.text.trim()) {
        textChunks.push(contentItem.text.trim());
      }
    });
  });

  return textChunks.join(" ").trim();
}

async function rewriteBulletWithLlm({ promptTemplate }) {
  const config = getGroqConfig();
  if (!config) {
    return {
      ok: false,
      reason: "GROQ_API_KEY_NOT_CONFIGURED"
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.25,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You are an elite resume editor. Return only one rewritten bullet point with no markdown or explanations."
          },
          {
            role: "user",
            content: promptTemplate
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        ok: false,
        reason: `GROQ_HTTP_${response.status}`,
        details: errorBody.slice(0, 400)
      };
    }

    const payload = await response.json();
    const rewrittenBullet = extractResponseText(payload);

    if (!rewrittenBullet) {
      return {
        ok: false,
        reason: "GROQ_EMPTY_OUTPUT"
      };
    }

    return {
      ok: true,
      rewrittenBullet,
      engine: `groq-${config.model}`
    };
  } catch (error) {
    return {
      ok: false,
      reason: error?.name === "AbortError" ? "GROQ_TIMEOUT" : "GROQ_REQUEST_FAILED",
      details: error?.message || "Unknown Groq request error"
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  rewriteBulletWithLlm
};
