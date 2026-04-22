import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "../DashboardPage";
import {
  generateCoverLetter,
  getCoverLetterProfiles,
  getDashboardResumes,
  getDashboardSummary,
  getLatestResumePdf,
  getResumeIterationTimeline
} from "../../api/resumeApi";

vi.mock("../../api/resumeApi", () => ({
  generateCoverLetter: vi.fn(),
  getCoverLetterProfiles: vi.fn(),
  getDashboardResumes: vi.fn(),
  getDashboardSummary: vi.fn(),
  getLatestResumePdf: vi.fn(),
  getResumeIterationTimeline: vi.fn()
}));

describe("DashboardPage integration flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getDashboardSummary.mockResolvedValue({
      ok: true,
      summary: {
        totals: {
          resumeCount: 13,
          versionCount: 7,
          analysisCount: 5,
          rewriteCount: 2
        },
        latestUpdatedAt: "2025-02-15T11:30:00.000Z"
      }
    });

    getDashboardResumes.mockResolvedValue({
      ok: true,
      resumes: [
        {
          id: "resume-1",
          profile: {
            fullName: "Priya Nair"
          },
          currentVersion: 4,
          analysisCount: 3,
          rewriteCount: 2
        }
      ]
    });

    getResumeIterationTimeline.mockResolvedValue({
      ok: true,
      timeline: [
        {
          eventType: "version",
          eventId: "version-1",
          createdAt: "2025-02-14T11:00:00.000Z",
          details: {
            versionNumber: 4,
            source: "autosave"
          }
        }
      ]
    });

    getLatestResumePdf.mockResolvedValue({
      ok: false,
      error: {
        message: "No generated PDF found"
      }
    });

    getCoverLetterProfiles.mockResolvedValue({
      ok: true,
      profiles: [
        {
          id: "profile-default",
          name: "Balanced Story"
        }
      ]
    });

    generateCoverLetter.mockResolvedValue({
      ok: true,
      coverLetter: {
        content: "Dear Hiring Team, I am excited to apply for this role.",
        wordCount: 11,
        generatedAt: "2025-02-15T11:35:00.000Z",
        profile: {
          id: "profile-default",
          name: "Balanced Story"
        }
      }
    });
  });

  it("loads summary and timeline, then generates a cover letter", async () => {
    const user = userEvent.setup();
    const onToast = vi.fn();

    render(
      <DashboardPage
        resumeId="resume-1"
        resumeData={{ profile: { fullName: "Priya Nair" } }}
        entitlements={{ coverLetters: true }}
        onToast={onToast}
      />
    );

    expect(await screen.findByText("Total Resumes")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    await waitFor(() => {
      expect(getDashboardSummary).toHaveBeenCalledWith(25);
      expect(getDashboardResumes).toHaveBeenCalledWith(25);
      expect(getResumeIterationTimeline).toHaveBeenCalledWith("resume-1", 100);
      expect(getCoverLetterProfiles).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Version Update")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Company name"),
      "Northstar Labs"
    );

    await user.type(
      screen.getByPlaceholderText("Paste the target job description"),
      "We are looking for a frontend engineer with strong React and testing skills."
    );

    await user.click(
      screen.getByRole("button", { name: /generate cover letter/i })
    );

    await waitFor(() => {
      expect(generateCoverLetter).toHaveBeenCalledTimes(1);
    });

    expect(generateCoverLetter).toHaveBeenCalledWith(
      expect.objectContaining({
        resumeId: "resume-1",
        companyName: "Northstar Labs",
        profileId: "profile-default",
        tone: "professional",
        maxWords: 280
      })
    );

    expect(
      await screen.findByText("Dear Hiring Team, I am excited to apply for this role.")
    ).toBeInTheDocument();

    expect(onToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        title: "Cover letter ready"
      })
    );
  });
});
