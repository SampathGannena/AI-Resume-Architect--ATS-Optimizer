import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Stub heavy/native deps before any module under test imports them.
vi.mock("@/lib/fileParser", () => ({ fileToText: vi.fn() }));
vi.mock("../lib/fileParser", () => ({ fileToText: vi.fn() }));
vi.mock("@/lib/pdfExport", () => ({ exportNodeToPdf: vi.fn() }));
// Provide a global Worker shim so any stray worker construction doesn't crash.
// @ts-ignore
if (typeof globalThis.Worker === "undefined") globalThis.Worker = class { postMessage() {} terminate() {} } as any;

// Mock auth hook — simulate a freshly-signed-up user whose subscription
// row hasn't loaded yet (sub === null) and one with 0/3 usage.
vi.mock("@/hooks/useAuth", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useAuth")>("@/hooks/useAuth");
  return {
    ...actual,
    useAuth: () => ({
      user: { id: "u1", email: "new@user.dev" },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    }),
    useSubscription: () => ({
      sub: null, // still loading from server
      loading: true,
      refetch: vi.fn(),
    }),
  };
});

// Stub APIs so pages don't try real HTTP.
vi.mock("@/lib/api/resume", () => ({
  resumeApi: { list: vi.fn().mockResolvedValue({ success: true, data: [] }) },
}));
vi.mock("@/lib/api/coverLetter", () => ({
  coverLetterApi: { list: vi.fn().mockResolvedValue({ success: true, data: [] }) },
}));
vi.mock("@/lib/api", async () => {
  const resume = await import("@/lib/api/resume");
  const cover = await import("@/lib/api/coverLetter");
  return { resumeApi: resume.resumeApi, coverLetterApi: cover.coverLetterApi };
});

import Builder from "@/pages/Builder";
import CoverLetter from "@/pages/CoverLetter";

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("New free user — no premature subscription lockout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Builder renders Optimize CTA and does NOT show 'used all 3 free resumes' banner", () => {
    renderWithRouter(<Builder />);
    expect(screen.getByRole("button", { name: /optimize my resume/i })).toBeEnabled();
    expect(screen.queryByText(/used all 3 free resumes/i)).not.toBeInTheDocument();
  });

  it("CoverLetter renders Generate CTA and does NOT show 'used your free cover letter' banner", () => {
    renderWithRouter(<CoverLetter />);
    expect(screen.getByRole("button", { name: /generate cover letter/i })).toBeEnabled();
    expect(screen.queryByText(/used your free cover letter/i)).not.toBeInTheDocument();
  });
});
