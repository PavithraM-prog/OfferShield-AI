import { describe, expect, it } from "vitest";
import { analyzeOffer } from "@/lib/analysis/analyzer";
import { buildReportSnapshot } from "@/lib/report/reportModel";

const text = "To confirm your acceptance, please pay the registration fee.";

function snapshot(includeSourceText: boolean) {
  return buildReportSnapshot({
    result: analyzeOffer(text),
    analyzedText: text,
    senderEmail: " recruiter@agency.example ",
    employerWebsite: "",
    includeSourceText,
    now: new Date("2026-01-02T03:04:05Z"),
  });
}

describe("buildReportSnapshot", () => {
  it("excludes the complete source text by default", () => {
    const report = snapshot(false);
    expect(report.includeSourceText).toBe(false);
    expect(report.sourceText).toBeNull();
  });

  it("includes the source text only when explicitly requested", () => {
    const report = snapshot(true);
    expect(report.includeSourceText).toBe(true);
    expect(report.sourceText).toBe(text);
  });

  it("formats the generation time deterministically", () => {
    expect(snapshot(false).generatedAt).toBe("2026-01-02 03:04:05 UTC");
  });

  it("trims contact fields and keeps the validated result", () => {
    const report = snapshot(false);
    expect(report.senderEmail).toBe("recruiter@agency.example");
    expect(report.employerWebsite).toBe("");
    expect(report.result.findings.length).toBeGreaterThan(0);
  });

  it("carries no credentials, prompts, or provider errors", () => {
    const serialized = JSON.stringify(snapshot(false));
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("LLM_");
    expect(serialized).not.toContain("Authorization");
  });
});
