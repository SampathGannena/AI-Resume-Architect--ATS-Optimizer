import { describe, it, expect } from "vitest";
import {
  canCreateResume,
  canCreateCoverLetter,
  FREE_RESUME_LIMIT,
  FREE_COVER_LETTER_LIMIT,
} from "@/hooks/useAuth";

describe("free-tier gating", () => {
  it("treats unloaded subscription (null) as accessible — no premature lockout", () => {
    expect(canCreateResume(null)).toBe(true);
    expect(canCreateCoverLetter(null)).toBe(true);
  });

  it("brand-new free user (0/3 used) can create both resume and cover letter", () => {
    const sub = { plan: "free" as const, resumes_used: 0, cover_letters_used: 0 };
    expect(canCreateResume(sub)).toBe(true);
    expect(canCreateCoverLetter(sub)).toBe(true);
  });

  it("free user at limit (3/3) is blocked", () => {
    const sub = {
      plan: "free" as const,
      resumes_used: FREE_RESUME_LIMIT,
      cover_letters_used: FREE_COVER_LETTER_LIMIT,
    };
    expect(canCreateResume(sub)).toBe(false);
    expect(canCreateCoverLetter(sub)).toBe(false);
  });

  it("pro user is never blocked regardless of usage", () => {
    const sub = { plan: "pro" as const, resumes_used: 999, cover_letters_used: 999 };
    expect(canCreateResume(sub)).toBe(true);
    expect(canCreateCoverLetter(sub)).toBe(true);
  });

  it("exposes 3/3 free limits", () => {
    expect(FREE_RESUME_LIMIT).toBe(3);
    expect(FREE_COVER_LETTER_LIMIT).toBe(3);
  });
});
