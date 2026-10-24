import { describe, expect, it } from "vitest";
import { analyzeOffer } from "@/lib/analysis/analyzer";
import { mergeAiAnalysis } from "@/lib/analysis/aiMerge";
import type { AiAnalysisOutput } from "@/lib/llm/schema";

function aiOutput(overrides: Partial<AiAnalysisOutput> = {}): AiAnalysisOutput {
  return {
    extracted: {
      claimedCompanyName: null,
      roleTitle: null,
      responsibilities: null,
      contactInformation: null,
      paymentRequest: null,
      deadlineOrPressure: null,
      sensitiveCredentialRequests: null,
      additionalConcerns: null,
    },
    candidateFindings: [],
    missingOrUncertain: [],
    suggestedVerificationActions: [],
    ...overrides,
  };
}

function aiFinding(
  overrides: Partial<AiAnalysisOutput["candidateFindings"][number]> = {},
): AiAnalysisOutput["candidateFindings"][number] {
  return {
    category: "OTHER",
    title: "Document copy requested",
    quote: "require a copy of your passport",
    explanation: "The message asks for a document copy without explaining its handling.",
    nextStep: "Ask why the document is needed and how it will be stored.",
    ...overrides,
  };
}

describe("mergeAiAnalysis", () => {
  it("keeps a validated AI finding with offsets into the original text", () => {
    const text = "We also require a copy of your passport for onboarding.";
    const ruleResult = analyzeOffer(text);
    const output = aiOutput({ candidateFindings: [aiFinding()] });

    const merged = mergeAiAnalysis(text, ruleResult, output);
    const aiFindings = merged.findings.filter((finding) => finding.basis === "ai");

    expect(aiFindings).toHaveLength(1);
    expect(aiFindings[0].start).toBe(text.indexOf("require a copy of your passport"));
    expect(text.slice(aiFindings[0].start, aiFindings[0].end)).toBe(aiFindings[0].quote);
    expect(aiFindings[0].priority).toBe("LOW");
    expect(merged.rejectedFindings).toBe(0);
  });

  it("rejects candidate findings whose evidence does not appear in the text", () => {
    const text = "We also require a copy of your passport for onboarding.";
    const ruleResult = analyzeOffer(text);
    const output = aiOutput({
      candidateFindings: [aiFinding({ quote: "this sentence is not in the offer" })],
    });

    const merged = mergeAiAnalysis(text, ruleResult, output);

    expect(merged.rejectedFindings).toBe(1);
    expect(merged.findings.some((finding) => finding.basis === "ai")).toBe(false);
    expect(merged.findings).toEqual(ruleResult.findings);
  });

  it("matches repeated quotations deterministically", () => {
    const text = "Send your passport copy. Send your passport copy.";
    const ruleResult = analyzeOffer(text);
    const quote = "Send your passport copy.";
    const output = aiOutput({
      candidateFindings: [
        aiFinding({ quote }),
        aiFinding({ quote }),
        aiFinding({ quote }),
      ],
    });

    const merged = mergeAiAnalysis(text, ruleResult, output);
    const aiFindings = merged.findings.filter((finding) => finding.basis === "ai");

    expect(aiFindings).toHaveLength(2);
    expect(aiFindings[0].start).toBe(0);
    expect(aiFindings[1].start).toBe(text.indexOf(quote, 1));
    expect(merged.rejectedFindings).toBe(1);
  });

  it("marks overlapping rule findings as both without changing their priority", () => {
    const text = "This offer expires in 24 hours. Act now!";
    const ruleResult = analyzeOffer(text);
    const output = aiOutput({
      candidateFindings: [
        aiFinding({
          category: "PRESSURE",
          title: "Short deadline and pressure",
          quote: "Act now",
        }),
      ],
    });

    const merged = mergeAiAnalysis(text, ruleResult, output);

    expect(merged.findings).toHaveLength(ruleResult.findings.length);
    const pressure = merged.findings.find((finding) => finding.category === "PRESSURE");
    expect(pressure?.basis).toBe("both");
    expect(pressure?.priority).toBe("MEDIUM");
  });

  it("never removes rule findings when the AI reports nothing", () => {
    const text = "To confirm your acceptance, please pay the registration fee.";
    const ruleResult = analyzeOffer(text);

    const merged = mergeAiAnalysis(text, ruleResult, aiOutput());

    expect(merged.findings).toEqual(ruleResult.findings);
    expect(merged.findings.some((finding) => finding.category === "PAYMENT")).toBe(true);
  });

  it("deduplicates overlapping AI-only findings in the same category", () => {
    const text = "Send your passport copy.";
    const ruleResult = analyzeOffer(text);
    const quote = "Send your passport copy.";

    const merged = mergeAiAnalysis(
      text,
      ruleResult,
      aiOutput({ candidateFindings: [aiFinding({ quote }), aiFinding({ quote })] }),
    );

    expect(merged.findings.filter((finding) => finding.basis === "ai")).toHaveLength(1);
  });

  it("rejects AI findings that contain unsupported verdict language", () => {
    const text = "We also require a copy of your passport for onboarding.";
    const ruleResult = analyzeOffer(text);
    const output = aiOutput({
      candidateFindings: [
        aiFinding({ explanation: "This is definitely a scam and has a 97% fraud probability." }),
      ],
    });

    const merged = mergeAiAnalysis(text, ruleResult, output);

    expect(merged.rejectedFindings).toBe(1);
    expect(merged.findings.some((finding) => finding.basis === "ai")).toBe(false);
  });

  it("sanitises extracted claims that contain unsupported verdict language", () => {
    const text = "Acme Labs offers you the internship.";
    const ruleResult = analyzeOffer(text);
    const output = aiOutput({
      extracted: {
        claimedCompanyName: "Acme Labs (verified employer)",
        roleTitle: "Internship",
        responsibilities: null,
        contactInformation: ["careers@acmelabs.com", "guaranteed safe"],
        paymentRequest: null,
        deadlineOrPressure: null,
        sensitiveCredentialRequests: null,
        additionalConcerns: null,
      },
    });

    const merged = mergeAiAnalysis(text, ruleResult, output);

    expect(merged.extracted.claimedCompanyName).toBeNull();
    expect(merged.extracted.contactInformation).toEqual(["careers@acmelabs.com"]);
  });

  it("adds AI missing information only when the rules did not already report the field", () => {
    const text = "Thanks for your interest.";
    const ruleResult = analyzeOffer(text);

    const merged = mergeAiAnalysis(
      text,
      ruleResult,
      aiOutput({
        missingOrUncertain: [
          { field: "Company name", note: "The company name is not stated." },
          { field: "Start date", note: "The start date is unclear." },
        ],
      }),
    );

    const companyEntries = merged.missingInfo.filter(
      (item) => item.field.toLowerCase() === "company name",
    );
    expect(companyEntries).toHaveLength(1);
    expect(companyEntries[0].source).toBe("rule");

    const startDate = merged.missingInfo.find((item) => item.field === "Start date");
    expect(startDate?.source).toBe("ai");
  });

  it("adds AI verification actions without duplicating rule steps", () => {
    const text = "To confirm your acceptance, please pay the registration fee.";
    const ruleResult = analyzeOffer(text);

    const merged = mergeAiAnalysis(
      text,
      ruleResult,
      aiOutput({
        suggestedVerificationActions: [
          ruleResult.verificationSteps[0] ?? "Verify through official channels.",
          "Confirm the fee policy through the employer's official website.",
        ],
      }),
    );

    const duplicatedSteps = merged.verificationSteps.filter(
      (step) => step === (ruleResult.verificationSteps[0] ?? ""),
    );
    expect(duplicatedSteps).toHaveLength(1);
    expect(merged.verificationSteps).toContain(
      "Confirm the fee policy through the employer's official website.",
    );
  });
});
