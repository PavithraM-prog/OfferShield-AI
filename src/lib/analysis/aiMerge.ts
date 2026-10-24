import { createEvidenceMatcher } from "@/lib/analysis/evidence";
import type {
  AnalysisResult,
  ExtractedClaimedFields,
  Finding,
  FindingCategory,
  MissingInfoItem,
  ReviewPriority,
} from "@/lib/analysis/types";
import type { AiAnalysisOutput, AiExtractedFields } from "@/lib/llm/schema";

/**
 * Application-side content policy. Even when the prompt asks the model to
 * avoid verdicts, the model can still emit them. Any model text containing an
 * unsupported verdict/probability is rejected in code.
 */
const UNSUPPORTED_VERDICT_PATTERNS: RegExp[] = [
  /\bverified\s+employer\b/i,
  /\bguaranteed\s+safe\b/i,
  /\bdefinitely\s+(?:a\s+)?scam\b/i,
  /\b(?:is|are)\s+(?:definitely\s+)?(?:a\s+)?scam\b/i,
  /\b(?:fraud|scam)\s+(?:probability|percentage|score)\b/i,
  /\b\d{1,3}\s*%\s*(?:likely\s+)?(?:scam|fraud|fake|genuine|safe)\b/i,
];

const AI_CATEGORY_PRIORITY: Record<FindingCategory, ReviewPriority> = {
  PAYMENT: "HIGH",
  SECURITY: "HIGH",
  PRESSURE: "MEDIUM",
  OTHER: "LOW",
};

export function hasUnsupportedVerdict(value: string): boolean {
  return UNSUPPORTED_VERDICT_PATTERNS.some((pattern) => pattern.test(value));
}

function sanitizeNullable(value: string | null): string | null {
  if (value === null || hasUnsupportedVerdict(value)) {
    return null;
  }
  return value;
}

function sanitizeList(values: string[] | null): string[] | null {
  if (values === null) {
    return null;
  }
  return values.filter((value) => !hasUnsupportedVerdict(value));
}

function sanitizeExtracted(fields: AiExtractedFields): ExtractedClaimedFields {
  return {
    claimedCompanyName: sanitizeNullable(fields.claimedCompanyName),
    roleTitle: sanitizeNullable(fields.roleTitle),
    responsibilities: sanitizeList(fields.responsibilities),
    contactInformation: sanitizeList(fields.contactInformation),
    paymentRequest: fields.paymentRequest
      ? { statedPurpose: sanitizeNullable(fields.paymentRequest.statedPurpose) }
      : null,
    deadlineOrPressure: sanitizeNullable(fields.deadlineOrPressure),
    sensitiveCredentialRequests: sanitizeNullable(fields.sensitiveCredentialRequests),
    additionalConcerns: sanitizeList(fields.additionalConcerns),
  };
}

function rangesOverlap(a: Finding, b: Finding): boolean {
  return a.start < b.end && b.start < a.end;
}

export interface AiMergeResult {
  extracted: ExtractedClaimedFields;
  findings: Finding[];
  missingInfo: MissingInfoItem[];
  verificationSteps: string[];
  rejectedFindings: number;
}

/**
 * Merges validated AI candidates with rule findings.
 *
 * Policy:
 * - Rule findings are never removed or weakened; AI findings only add evidence.
 * - AI findings whose quote cannot be located exactly are rejected and counted.
 * - An AI finding that overlaps a rule finding in the same category marks that
 *   rule finding as "both" and keeps the rule priority unchanged.
 * - Overlapping AI-only findings in the same category are deduplicated.
 * - The AI cannot set priority or the overall label.
 */
export function mergeAiAnalysis(
  text: string,
  ruleResult: AnalysisResult,
  output: AiAnalysisOutput,
): AiMergeResult {
  const locate = createEvidenceMatcher(text);
  const findings: Finding[] = [...ruleResult.findings];
  let rejectedFindings = 0;
  let aiFindingCount = 0;

  for (const candidate of output.candidateFindings) {
    const combined = `${candidate.title}\n${candidate.explanation}\n${candidate.nextStep}`;
    if (hasUnsupportedVerdict(combined)) {
      rejectedFindings += 1;
      continue;
    }

    const match = locate(candidate.quote);
    if (match === null) {
      rejectedFindings += 1;
      continue;
    }

    aiFindingCount += 1;
    const aiFinding: Finding = {
      id: `AI-${candidate.category}-${String(aiFindingCount).padStart(3, "0")}`,
      category: candidate.category,
      priority: AI_CATEGORY_PRIORITY[candidate.category],
      title: candidate.title,
      quote: candidate.quote,
      start: match.start,
      end: match.end,
      explanation: candidate.explanation,
      nextStep: candidate.nextStep,
      basis: "ai",
    };

    const overlappingRule = findings.find(
      (finding) =>
        finding.basis !== "ai" &&
        finding.category === aiFinding.category &&
        rangesOverlap(finding, aiFinding),
    );
    if (overlappingRule) {
      overlappingRule.basis = "both";
      continue;
    }

    const overlappingAi = findings.find(
      (finding) =>
        finding.basis === "ai" &&
        finding.category === aiFinding.category &&
        rangesOverlap(finding, aiFinding),
    );
    if (overlappingAi) {
      continue;
    }

    findings.push(aiFinding);
  }

  const ruleFieldNames = new Set(ruleResult.missingInfo.map((item) => item.field.toLowerCase()));
  const aiMissingInfo: MissingInfoItem[] = output.missingOrUncertain
    .filter((item) => !hasUnsupportedVerdict(item.note))
    .filter((item) => !ruleFieldNames.has(item.field.toLowerCase()))
    .map((item) => ({
      field: item.field,
      status: "NOT_IDENTIFIED",
      note: item.note,
      source: "ai",
    }));

  const missingInfo = [...ruleResult.missingInfo, ...aiMissingInfo];

  const verificationSteps: string[] = [...ruleResult.verificationSteps];
  const addStep = (step: string): void => {
    if (step.trim().length === 0 || hasUnsupportedVerdict(step)) {
      return;
    }
    const alreadyPresent = verificationSteps.some(
      (existing) => existing.toLowerCase() === step.toLowerCase(),
    );
    if (!alreadyPresent) {
      verificationSteps.push(step);
    }
  };

  for (const candidate of output.candidateFindings) {
    addStep(candidate.nextStep);
  }
  for (const step of output.suggestedVerificationActions) {
    addStep(step);
  }

  return {
    extracted: sanitizeExtracted(output.extracted),
    findings,
    missingInfo,
    verificationSteps,
    rejectedFindings,
  };
}
