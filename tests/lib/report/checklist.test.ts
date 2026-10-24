import { describe, expect, it } from "vitest";
import { analyzeOffer } from "@/lib/analysis/analyzer";
import type { AnalysisResult } from "@/lib/analysis/types";
import { buildVerificationChecklist } from "@/lib/report/checklist";

const paymentText =
  "To confirm your acceptance, please pay the registration fee.";

function actions(result: AnalysisResult): string[] {
  return buildVerificationChecklist(result).map((item) => item.action);
}

describe("buildVerificationChecklist", () => {
  it("derives an item from each flagged finding and links it back", () => {
    const result = analyzeOffer(paymentText);
    const items = buildVerificationChecklist(result);
    const paymentFinding = result.findings[0];

    const matching = items.find((item) => item.findingId === paymentFinding.id);
    expect(matching).toBeDefined();
    expect(matching?.action).toBe(paymentFinding.nextStep);
    expect(matching?.source).toBe("finding");
    expect(matching?.rationale).toContain(paymentFinding.title);
  });

  it("adds clearly labelled general steps", () => {
    const result = analyzeOffer(paymentText);
    const items = buildVerificationChecklist(result);

    expect(items.some((item) => item.id === "general:recruiter")).toBe(true);
    expect(items.some((item) => item.id === "general:role")).toBe(true);
    expect(items.some((item) => item.id === "general:payment")).toBe(true);
    expect(
      items.every((item) => item.action.trim().length > 0 && item.rationale.trim().length > 0),
    ).toBe(true);
  });

  it("does not repeat identical actions", () => {
    const result = analyzeOffer(
      "To confirm your acceptance, please pay the registration fee. You must also transfer the security deposit.",
    );
    const combined = actions(result).map((action) => action.toLowerCase());
    expect(new Set(combined).size).toBe(combined.length);
  });

  it("adds a domain-comparison step only when the domains differ", () => {
    const text =
      "We are pleased to offer you the internship at Acme Labs. Your responsibilities include supporting the team. Contact careers@acmelabs.example.";
    const differing = analyzeOffer(text, {
      senderEmail: "recruiter@agency.example",
      employerWebsite: "https://acmelabs.example",
    });
    const matching = analyzeOffer(text, {
      senderEmail: "careers@acmelabs.example",
      employerWebsite: "https://acmelabs.example",
    });

    expect(actions(differing).some((action) => action.includes("Compare the sender domain"))).toBe(
      true,
    );
    expect(actions(matching).some((action) => action.includes("Compare the sender domain"))).toBe(
      false,
    );
  });

  it("still offers general steps when nothing was flagged", () => {
    const result = analyzeOffer(
      "We are pleased to offer you the internship at Acme Labs. Your responsibilities include supporting the design team. No registration fee is required. Contact careers@acmelabs.example.",
    );
    expect(result.findings).toHaveLength(0);
    const items = buildVerificationChecklist(result);
    expect(items.some((item) => item.id === "general:recruiter")).toBe(true);
    expect(items.some((item) => item.id === "general:role")).toBe(true);
    expect(items.every((item) => item.source === "general")).toBe(true);
  });

  it("does not claim that OfferShield verified anything", () => {
    const result = analyzeOffer(paymentText);
    const combined = actions(result).join(" ").toLowerCase();
    expect(combined).not.toContain("we verified");
    expect(combined).not.toContain("verified employer");
    expect(combined).not.toContain("guaranteed");
  });
});
