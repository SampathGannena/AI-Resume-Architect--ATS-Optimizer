import React from "react";

const defaultTitles = {
  success: "Success",
  error: "Action failed",
  warning: "Notice",
  info: "Update"
};

export default function ToastViewport({ toasts, onDismiss }) {
  if (!Array.isArray(toasts) || toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-viewport" role="region" aria-label="Notifications">
      {toasts.map((toast) => {
        const tone = toast.type || "info";

        return (
          <article
            key={toast.id}
            className={`toast-card ${tone}`}
            role={tone === "error" ? "alert" : "status"}
            aria-live={tone === "error" ? "assertive" : "polite"}
          >
            <div className="toast-copy">
              <strong>{toast.title || defaultTitles[tone] || defaultTitles.info}</strong>
              {toast.message ? <p>{toast.message}</p> : null}
            </div>
            <button
              type="button"
              className="toast-dismiss"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
            >
              Close
            </button>
          </article>
        );
      })}
    </div>
  );
}