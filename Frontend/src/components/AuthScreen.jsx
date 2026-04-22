import React, { useMemo, useState } from "react";

function getPasswordStrength(passwordValue) {
  const password = String(passwordValue || "");
  if (!password) {
    return { label: "Add a password to check strength", tone: "idle", percent: 0 };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const percent = Math.min(100, Math.round((score / 5) * 100));

  if (score <= 2) {
    return { label: "Weak password", tone: "weak", percent };
  }
  if (score === 3) {
    return { label: "Fair password", tone: "fair", percent };
  }
  if (score === 4) {
    return { label: "Good password", tone: "good", percent };
  }

  return { label: "Strong password", tone: "strong", percent };
}

export default function AuthScreen({
  onLogin,
  onRegister,
  isSubmitting,
  errorMessage = "",
  brandName = "CareerForge"
}) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const title = useMemo(
    () => (mode === "login" ? "Welcome Back" : "Create Your Account"),
    [mode]
  );

  const subTitle = useMemo(
    () =>
      mode === "login"
        ? "Sign in to continue editing your resumes and exports."
        : "Set up secure access so your drafts, imports, and exports stay synced.",
    [mode]
  );

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  function handleModeSwitch(nextMode) {
    setMode(nextMode);
    setShowPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (mode === "login") {
      await onLogin?.({ email, password });
      return;
    }

    await onRegister?.({ name, email, password });
  }

  return (
    <main className="auth-screen-wrap">
      <section className="panel auth-card">
        <div className="auth-layout">
          <aside className="auth-story" aria-hidden="true">
            <p className="auth-story-kicker">{brandName}</p>
            <h3>Build resume versions recruiters actually read.</h3>
            <p>
              Import your existing resume, optimize with ATS feedback, and export polished
              applications in minutes.
            </p>
            <ul className="auth-benefit-list">
              <li>Import from PDF and continue editing instantly.</li>
              <li>Track improvements with ATS score insights.</li>
              <li>Export clean templates tailored for applications.</li>
            </ul>
          </aside>

          <div className="auth-main">
            <div className="auth-head">
              <p className="auth-kicker">{mode === "login" ? "Secure Sign In" : "Quick Setup"}</p>
              <h2>{title}</h2>
              <p className="helper-text">{subTitle}</p>
            </div>

            <div
              className="auth-switch-row"
              role="tablist"
              aria-label="Authentication mode"
              data-mode={mode}
            >
              <button
                id="auth-tab-login"
                role="tab"
                type="button"
                aria-selected={mode === "login"}
                aria-controls="auth-panel-login"
                className={`auth-switch ${mode === "login" ? "active" : ""}`}
                onClick={() => handleModeSwitch("login")}
              >
                Sign In
              </button>
              <button
                id="auth-tab-register"
                role="tab"
                type="button"
                aria-selected={mode === "register"}
                aria-controls="auth-panel-register"
                className={`auth-switch ${mode === "register" ? "active" : ""}`}
                onClick={() => handleModeSwitch("register")}
              >
                Create Account
              </button>
            </div>

            <form
              id={`auth-panel-${mode}`}
              role="tabpanel"
              aria-labelledby={`auth-tab-${mode}`}
              className="auth-form"
              onSubmit={handleSubmit}
            >
              {mode === "register" ? (
                <label className="auth-field">
                  Full Name
                  <input
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>
              ) : null}

              <label className="auth-field">
                Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              <label className="auth-field auth-password-field">
                <span className="auth-field-label-row">
                  <span>Password</span>
                </span>
                <div className="auth-password-wrap">
                  <input
                    className="auth-password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={mode === "register" ? 8 : undefined}
                    required
                  />
                  <button
                    type="button"
                    className="auth-inline-toggle auth-inline-toggle-floating"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <div className={`auth-strength ${passwordStrength.tone}`} aria-live="polite">
                <div className="auth-strength-track">
                  <span style={{ width: `${passwordStrength.percent}%` }} />
                </div>
                <p>{passwordStrength.label}</p>
              </div>

              <button className="auth-submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? mode === "login"
                    ? "Signing In..."
                    : "Creating Account..."
                  : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
              </button>

              {errorMessage ? <p className="error-text auth-error">{errorMessage}</p> : null}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
