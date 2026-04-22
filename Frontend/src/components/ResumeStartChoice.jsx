import React, { useEffect, useRef, useState } from "react";

function UploadIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 16V4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 8.5L12 4L16.5 8.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 14.5V17.2C4.5 18.1941 5.30589 19 6.3 19H17.7C18.6941 19 19.5 18.1941 19.5 17.2V14.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ResumeStartChoice({
  onCreateResume,
  onUploadResume,
  isCreating = false,
  isUploading = false,
  errorMessage = ""
}) {
  const inputRef = useRef(null);
  const successTimerRef = useRef(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [showSelectionSuccess, setShowSelectionSuccess] = useState(false);

  useEffect(
    () => () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    },
    []
  );

  function triggerSelectionSuccess() {
    setShowSelectionSuccess(true);

    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }

    successTimerRef.current = window.setTimeout(() => {
      setShowSelectionSuccess(false);
      successTimerRef.current = null;
    }, 1050);
  }

  function normalizePdfFile(file) {
    if (!file) return null;
    const fileName = String(file.name || "").toLowerCase();
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    return isPdf ? file : null;
  }

  async function startUpload(file) {
    const validFile = normalizePdfFile(file);
    if (!validFile) {
      return;
    }

    setSelectedFileName(validFile.name);
    triggerSelectionSuccess();
    await onUploadResume?.(validFile);
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    await startUpload(file);

    event.target.value = "";
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragActive(false);
  }

  async function handleDrop(event) {
    event.preventDefault();
    setIsDragActive(false);

    if (isCreating || isUploading) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    await startUpload(file);
  }

  return (
    <main className="resume-source-layout">
      <section className="panel resume-source-panel">
        <header className="resume-source-header">
          <p className="resume-source-kicker">Workspace Setup</p>
          <h2>Start Your Resume Journey</h2>
          <p className="helper-text">
            Pick your preferred path. You can start from scratch or upload a PDF to continue instantly.
          </p>
        </header>

        <div className="resume-source-grid">
          <article className="resume-source-card resume-source-card-create">
            <p className="resume-source-tag">Blank Canvas</p>
            <h3>Create a New Resume</h3>
            <p className="helper-text">
              Open a fresh draft in the editor with guided sections and live preview ready to edit.
            </p>
            <ul className="resume-source-benefits" aria-hidden="true">
              <li>Step-by-step section guidance</li>
              <li>Instant ATS preview updates</li>
              <li>Fast template switching</li>
            </ul>
            <button
              type="button"
              className="resume-source-primary-action"
              onClick={onCreateResume}
              disabled={isCreating || isUploading}
            >
              {isCreating ? "Creating Draft..." : "Create Your Own Resume"}
            </button>
          </article>

          <article className="resume-source-card resume-source-card-upload">
            <p className="resume-source-tag">Import Existing Resume</p>
            <h3>Upload Resume PDF</h3>
            <p className="helper-text">
              Drag and drop your resume, or browse your files. We will convert it into an editable draft.
            </p>

            <input
              ref={inputRef}
              className="resume-source-input-hidden"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={isCreating || isUploading}
            />

            <div
              className={`resume-upload-zone resume-source-action-surface ${isDragActive ? "drag-active" : ""} ${
                selectedFileName ? "has-file" : ""
              } ${showSelectionSuccess ? "selection-success" : ""}`}
              role="button"
              tabIndex={0}
              aria-label="Upload resume PDF"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="resume-upload-icon-wrap">
                <UploadIcon className="resume-upload-icon" />
              </div>
              <p className="resume-upload-title">Drop PDF Here</p>
              <p className="resume-upload-subtitle">or click to choose from your device</p>
              {showSelectionSuccess ? (
                <p className="resume-upload-success-badge" aria-live="polite">
                  File selected successfully
                </p>
              ) : null}
              <button
                type="button"
                className="resume-upload-browse-button"
                onClick={(event) => {
                  event.stopPropagation();
                  inputRef.current?.click();
                }}
                disabled={isCreating || isUploading}
              >
                <UploadIcon className="resume-upload-button-icon" />
                {isUploading ? "Importing PDF..." : "Browse PDF"}
              </button>
            </div>
            <p className={`resume-source-file ${showSelectionSuccess ? "success-pulse" : ""}`}>
              {selectedFileName ? (
                <>
                  <span className="resume-source-file-check" aria-hidden="true">
                    ✓
                  </span>
                  {`Selected: ${selectedFileName}`}
                </>
              ) : (
                "No file selected yet"
              )}
            </p>
          </article>
        </div>

        {errorMessage ? <p className="error-text resume-source-error">{errorMessage}</p> : null}
      </section>
    </main>
  );
}
