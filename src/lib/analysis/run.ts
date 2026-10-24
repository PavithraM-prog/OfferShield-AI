import { analyzeOffer } from "@/lib/analysis/analyzer";
import { mergeAiAnalysis } from "@/lib/analysis/aiMerge";
import { selectOverallLabel } from "@/lib/analysis/labels";
import {
  LIMITATION_RULE_ONLY,
  REVIEW_MODES,
  REVIEW_MODE_LABELS,
  type AnalysisResult,
} from "@/lib/analysis/types";
import { readLlmConfig } from "@/lib/llm/config";
import { buildUserPrompt, SYSTEM_PROMPT } from "@/lib/llm/prompt";
import { LLM_ERROR_MESSAGES, requestLlmCompletion } from "@/lib/llm/provider";
import { parseAiAnalysisOutput } from "@/lib/llm/schema";

export interface RunAnalysisOptions {
  text: string;
  senderEmail?: string;
  employerWebsite?: string;
  /** Explicit user opt-in. Without it, no provider request is made. */
  aiConsent?: boolean;
  /** Injectable for tests; defaults to the server environment. */
  env?: Record<string, string | undefined>;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

function aiUnavailable(
  ruleResult: AnalysisResult,
  limitations: string[],
  reasonMessage: string,
): AnalysisResult {
  return {
    ...ruleResult,
    mode: REVIEW_MODES.AI_UNAVAILABLE,
    modeLabel: REVIEW_MODE_LABELS["ai-unavailable"],
    extracted: null,
    limitations: [...limitations, `${reasonMessage} Only the rule-based results are shown.`],
  };
}

/**
 * Runs the deterministic analyzer for every request. The AI adapter is only
 * contacted when the user opted in AND the server has a complete provider
 * configuration. Rule findings are never replaced or suppressed by AI output.
 */
export async function runOfferAnalysis(options: RunAnalysisOptions): Promise<AnalysisResult> {
  const ruleResult = analyzeOffer(options.text, {
    senderEmail: options.senderEmail,
    employerWebsite: options.employerWebsite,
  });

  if (!options.aiConsent) {
    return ruleResult;
  }

  // The AI path replaces the rule-only limitation with mode-specific wording.
  const baseLimitations = ruleResult.limitations.filter(
    (limitation) => limitation !== LIMITATION_RULE_ONLY,
  );

  const configResult = readLlmConfig(options.env ?? process.env);
  if (!configResult.configured) {
    return aiUnavailable(ruleResult, baseLimitations, LLM_ERROR_MESSAGES.MISSING_CONFIGURATION);
  }

  const completion = await requestLlmCompletion(
    configResult.config,
    {
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(options.text, {
        senderEmail: options.senderEmail,
        employerWebsite: options.employerWebsite,
      }),
    },
    options.fetchImpl,
  );

  if (!completion.ok) {
    return aiUnavailable(ruleResult, baseLimitations, completion.message);
  }

  const parsed = parseAiAnalysisOutput(completion.content);
  if (!parsed.ok) {
    const message =
      parsed.reason === "MALFORMED_JSON"
        ? "AI review is unavailable because the provider returned malformed output."
        : "AI review is unavailable because the provider output did not match the required structure.";
    return aiUnavailable(ruleResult, baseLimitations, message);
  }

  const merge = mergeAiAnalysis(options.text, ruleResult, parsed.output);
  const partial = merge.rejectedFindings > 0;
  const mode = partial ? REVIEW_MODES.AI_PARTIAL : REVIEW_MODES.RULE_AND_AI;
  const label = selectOverallLabel(
    merge.findings,
    ruleResult.contactComparisons,
    merge.missingInfo,
  );

  const limitations = [
    ...baseLimitations,
    "AI output is a model-generated interpretation of the supplied text and may be incomplete or incorrect.",
  ];
  if (partial) {
    limitations.push(
      "Partial AI review: some AI output could not be validated against the offer text and was omitted.",
    );
  }

  return {
    ...ruleResult,
    label,
    mode,
    modeLabel: REVIEW_MODE_LABELS[mode],
    findings: merge.findings,
    missingInfo: merge.missingInfo,
    extracted: merge.extracted,
    verificationSteps: merge.verificationSteps,
    limitations,
  };
}
