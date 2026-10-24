import { describe, expect, it } from "vitest";
import { analyzeOffer } from "@/lib/analysis/analyzer";
import type { AnalysisResult } from "@/lib/analysis/types";
import {
  buildVerificationEmail,
  findRemainingPlaceholders,
} from "@/lib/report/emailDraft";

const paymentText =
  "To confirm your acceptance, please pay the registration fee.";

function withExtracted(
  base: AnalysisResult,
  extracted: Partial<NonNullable<AnalysisResult["extracted"]>>,
): AnalysisResult {
  return {
    ...base,
    extracted: {
      claimedCompanyName: null,
      roleTitle: null,
      responsibilities: null,
      contactInformation: null,
      paymentRequest: null,
      deadlineOrPressure: null,
      sensitiveCredentialRequests: null,
      additionalConcerns: null,
      ...extracted,
    },
  };
}

describe("buildVerificationEmail", () => {
  it("uses clearly marked placeholders when claims are unavailable", () => {
    const draft = buildVerificationEmail(analyzeOffer(paymentText));

    expect(draft.subject).toContain("[role]");
    expect(draft.body).toContain("Hello [recruitment team],");
    expect(draft.body).toContain("[your name]");
    expect(draft.placeholders).toContain("[role]");
    expect(draft.placeholders).toContain("[recruitment team]");
    expect(draft.placeholders).toContain("[your name]");
  });

  it("uses validated extracted claims when the AI review completed", () => {
    const base = analyzeOffer(paymentText);
    const draft = buildVerificationEmail(
      withExtracted(base, {
        claimedCompanyName: "Acme Labs",
        roleTitle: "Design Intern",
        paymentRequest: { statedPurpose: "registration fee" },
      }),
    );

    expect(draft.subject).toBe("Request to verify recruitment details for Design Intern");
    expect(draft.body).toContain("Hello Acme Labs recruitment team,");
    expect(draft.body).toContain("regarding Design Intern at Acme Labs");
    expect(draft.placeholders).not.toContain("[role]");
  });

  it("asks only questions grounded in the review output", () => {
    const base = analyzeOffer(paymentText);
    const draft = buildVerificationEmail(base);

    expect(draft.body).toContain(
      "Could you confirm whether any payment, deposit, or fee is required",
    );
    expect(draft.body).toContain("role, responsibilities, supervisor");
    expect(draft.body).not.toContain("Acme");
    expect(draft.body).not.toContain("USD");
    expect(draft.body).not.toContain("scam");
    expect(draft.body).not.toContain("fraud");
  });

  it("includes a timeline question only when pressure is present", () => {
    const withoutPressure = buildVerificationEmail(analyzeOffer(paymentText));
    const withPressure = buildVerificationEmail(
      analyzeOffer("This offer expires in 24 hours. Act now to confirm."),
    );

    expect(withoutPressure.body).not.toContain("expected timeline");
    expect(withPressure.body).toContain("expected timeline");
  });

  it("includes an official-contact question when domains differ", () => {
    const result = analyzeOffer(
      "We are pleased to offer you the internship at Acme Labs. Your responsibilities include supporting the team. Contact careers@acmelabs.example.",
      {
        senderEmail: "recruiter@agency.example",
        employerWebsite: "https://acmelabs.example",
      },
    );
    const draft = buildVerificationEmail(result);

    expect(draft.body).toContain("official contact details and domain");
  });

  it("never chooses a recipient or claims the email was sent", () => {
    const draft = buildVerificationEmail(analyzeOffer(paymentText));
    expect(draft.body).not.toContain("@");
    expect(draft.body).not.toContain("mailto:");
    expect(draft.body.toLowerCase()).not.toContain("i have sent");
    expect(draft.body.toLowerCase()).not.toContain("i sent");
  });

  it("is deterministic for the same result", () => {
    const result = analyzeOffer(paymentText);
    expect(buildVerificationEmail(result)).toEqual(buildVerificationEmail(result));
  });
});

describe("findRemainingPlaceholders", () => {
  it("reports remaining placeholder tokens", () => {
    expect(findRemainingPlaceholders("Hello [recruitment team], [your name]")).toEqual([
      "[recruitment team]",
      "[your name]",
    ]);
  });

  it("returns an empty list for a completed draft", () => {
    expect(findRemainingPlaceholders("Hello Acme Labs, Jane Doe")).toEqual([]);
  });
});
