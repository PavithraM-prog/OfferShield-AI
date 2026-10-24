export const OVERALL_LABELS = {
  CONCERNING_SIGNALS_FOUND: "Concerning signals found",
  ADDITIONAL_VERIFICATION_NEEDED: "Additional verification needed",
  NO_CONFIGURED_WARNING_SIGNALS_FOUND: "No configured warning signals found",
  UNABLE_TO_COMPLETE_ANALYSIS: "Unable to complete analysis",
} as const;

export type OverallLabel = (typeof OVERALL_LABELS)[keyof typeof OVERALL_LABELS];

export type FindingCategory = "PAYMENT" | "SECURITY" | "PRESSURE" | "OTHER";

export type ReviewPriority = "HIGH" | "MEDIUM" | "LOW";

export const FINDING_CATEGORY_LABELS: Record<FindingCategory, string> = {
  PAYMENT: "Payment requests",
  SECURITY: "Credential requests",
  PRESSURE: "Pressure or short deadlines",
  OTHER: "Other verification concerns",
};

export interface Finding {
  id: string;
  category: FindingCategory;
  priority: ReviewPriority;
  title: string;
  quote: string;
  start: number;
  end: number;
  explanation: string;
  nextStep: string;
  /** Where the finding came from. Rule findings are never removed by AI merging. */
  basis: "rule" | "ai" | "both";
}

export interface ContactComparison {
  senderDomain: string | null;
  employerDomain: string | null;
  differs: boolean;
  note: string;
}

export interface MissingInfoItem {
  field: string;
  status: "MISSING" | "NOT_IDENTIFIED";
  note: string;
  source: "rule" | "ai";
}

export interface PaymentRequestClaim {
  statedPurpose: string | null;
}

/**
 * Claims extracted from the document. These are statements made in the offer
 * text, not independently verified facts.
 */
export interface ExtractedClaimedFields {
  claimedCompanyName: string | null;
  roleTitle: string | null;
  responsibilities: string[] | null;
  contactInformation: string[] | null;
  paymentRequest: PaymentRequestClaim | null;
  deadlineOrPressure: string | null;
  sensitiveCredentialRequests: string | null;
  additionalConcerns: string[] | null;
}

export const REVIEW_MODES = {
  RULE_ONLY: "rule-only",
  RULE_AND_AI: "rule-and-ai",
  AI_UNAVAILABLE: "ai-unavailable",
  AI_PARTIAL: "ai-partial",
} as const;

export type ReviewMode = (typeof REVIEW_MODES)[keyof typeof REVIEW_MODES];

export const REVIEW_MODE_LABELS: Record<ReviewMode, string> = {
  "rule-only": "Rule-based review only.",
  "rule-and-ai": "Rule-based + AI review completed.",
  "ai-unavailable": "Rule-based review completed; AI review unavailable.",
  "ai-partial": "Partial AI review; some output could not be validated.",
};

export const LIMITATION_GENUINE =
  "This review does not establish whether the offer or employer is genuine.";

export const LIMITATION_RULE_ONLY = "Rule-based review — AI analysis is not enabled.";

export interface AnalysisResult {
  label: OverallLabel;
  mode: ReviewMode;
  modeLabel: string;
  findings: Finding[];
  contactComparisons: ContactComparison[];
  missingInfo: MissingInfoItem[];
  /** Present only when AI review completed and its output passed validation. */
  extracted: ExtractedClaimedFields | null;
  verificationSteps: string[];
  limitations: string[];
}
