import { describe, expect, it } from "vitest";
import { parseAiAnalysisOutput } from "@/lib/llm/schema";

const minimalOutput = {
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
};

describe("parseAiAnalysisOutput", () => {
  it("accepts a valid structured response", () => {
    const result = parseAiAnalysisOutput(JSON.stringify(minimalOutput));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.extracted.claimedCompanyName).toBeNull();
      expect(result.output.candidateFindings).toHaveLength(0);
    }
  });

  it("accepts JSON wrapped in a markdown fence", () => {
    const result = parseAiAnalysisOutput("```json\n" + JSON.stringify(minimalOutput) + "\n```");
    expect(result.ok).toBe(true);
  });

  it("rejects malformed JSON", () => {
    const result = parseAiAnalysisOutput("not json at all");
    expect(result).toEqual({ ok: false, reason: "MALFORMED_JSON" });
  });

  it("rejects empty output", () => {
    const result = parseAiAnalysisOutput("   ");
    expect(result).toEqual({ ok: false, reason: "MALFORMED_JSON" });
  });

  it("rejects missing required fields", () => {
    const result = parseAiAnalysisOutput(JSON.stringify({ extracted: minimalOutput.extracted }));
    expect(result).toEqual({ ok: false, reason: "SCHEMA_INVALID" });
  });

  it("rejects unknown top-level fields such as a model verdict", () => {
    const result = parseAiAnalysisOutput(
      JSON.stringify({ ...minimalOutput, verdict: "safe", fraudProbability: 3 }),
    );
    expect(result).toEqual({ ok: false, reason: "SCHEMA_INVALID" });
  });

  it("rejects unknown candidate-finding fields", () => {
    const result = parseAiAnalysisOutput(
      JSON.stringify({
        ...minimalOutput,
        candidateFindings: [
          {
            category: "PAYMENT",
            title: "Payment request",
            quote: "pay the registration fee",
            explanation: "The sender asks for money.",
            nextStep: "Do not pay.",
            confidence: 0.99,
          },
        ],
      }),
    );
    expect(result).toEqual({ ok: false, reason: "SCHEMA_INVALID" });
  });

  it("rejects blank evidence quotes", () => {
    const result = parseAiAnalysisOutput(
      JSON.stringify({
        ...minimalOutput,
        candidateFindings: [
          {
            category: "PAYMENT",
            title: "Payment request",
            quote: "   ",
            explanation: "The sender asks for money.",
            nextStep: "Do not pay.",
          },
        ],
      }),
    );
    expect(result).toEqual({ ok: false, reason: "SCHEMA_INVALID" });
  });

  it("preserves nulls for absent extracted fields", () => {
    const result = parseAiAnalysisOutput(
      JSON.stringify({
        ...minimalOutput,
        extracted: {
          ...minimalOutput.extracted,
          claimedCompanyName: "Acme Labs",
          roleTitle: null,
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.extracted.claimedCompanyName).toBe("Acme Labs");
      expect(result.output.extracted.roleTitle).toBeNull();
    }
  });
});
