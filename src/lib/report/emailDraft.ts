import type { AnalysisResult } from "@/lib/analysis/types";

export const EMAIL_PLACEHOLDER_ROLE = "[role]";
export const EMAIL_PLACEHOLDER_TEAM = "[recruitment team]";
export const EMAIL_PLACEHOLDER_NAME = "[your name]";

export interface EmailDraft {
  subject: string;
  body: string;
  /** Placeholder tokens still present; the user must replace them before sending. */
  placeholders: string[];
}

const PLACEHOLDER_PATTERN = /\[[^\]\n]{1,40}\]/g;

function normaliseClaim(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length === 0) {
    return null;
  }
  return compact;
}

/**
 * Deterministic verification-email template. It uses only validated review
 * output and extracted claims, adds no new AI request, and never invents a
 * company, role, amount, deadline, or recipient address.
 */
export function buildVerificationEmail(result: AnalysisResult): EmailDraft {
  const role = normaliseClaim(result.extracted?.roleTitle);
  const company = normaliseClaim(result.extracted?.claimedCompanyName);
  const statedPurpose = normaliseClaim(result.extracted?.paymentRequest?.statedPurpose);

  const roleLabel = role ?? EMAIL_PLACEHOLDER_ROLE;
  const placeholders = new Set<string>();
  if (role === null) {
    placeholders.add(EMAIL_PLACEHOLDER_ROLE);
  }
  if (company === null) {
    placeholders.add(EMAIL_PLACEHOLDER_TEAM);
  }
  placeholders.add(EMAIL_PLACEHOLDER_NAME);

  const subject = `Request to verify recruitment details for ${roleLabel}`;

  const questions: string[] = [];
  const addQuestion = (question: string): void => {
    if (!questions.some((existing) => existing.toLowerCase() === question.toLowerCase())) {
      questions.push(question);
    }
  };

  addQuestion(
    "Could you confirm the role, responsibilities, supervisor, and the steps in your recruitment process?",
  );

  const hasPaymentFinding = result.findings.some((finding) => finding.category === "PAYMENT");
  if (hasPaymentFinding || statedPurpose !== null) {
    addQuestion(
      "Could you confirm whether any payment, deposit, or fee is required, and what it is for?",
    );
  }

  const hasSecurityFinding = result.findings.some((finding) => finding.category === "SECURITY");
  if (hasSecurityFinding || normaliseClaim(result.extracted?.sensitiveCredentialRequests)) {
    addQuestion(
      "Could you confirm what information is requested at each stage and how it will be handled?",
    );
  }

  const hasPressureFinding = result.findings.some((finding) => finding.category === "PRESSURE");
  if (hasPressureFinding || normaliseClaim(result.extracted?.deadlineOrPressure)) {
    addQuestion(
      "Could you confirm the expected timeline and whether a response is required by a specific date?",
    );
  }

  const hasContactDifference = result.contactComparisons.some((comparison) => comparison.differs);
  const contactMissing = result.missingInfo.some((item) => item.field === "Contact information");
  if (hasContactDifference || contactMissing) {
    addQuestion(
      "Could you confirm the official contact details and domain used for recruitment correspondence?",
    );
  }

  if (result.findings.some((finding) => finding.category === "OTHER")) {
    addQuestion(
      "Could you clarify any additional steps or documents mentioned in the message?",
    );
  }

  const greeting = company
    ? `Hello ${company} recruitment team,`
    : `Hello ${EMAIL_PLACEHOLDER_TEAM},`;

  const intro = company
    ? `I received a message regarding ${roleLabel} at ${company} and would like to confirm that it was issued through your authorized recruitment process.`
    : `I received a message regarding ${roleLabel} and would like to confirm that it was issued through your authorized recruitment process.`;

  const body = [
    greeting,
    "",
    intro,
    "",
    "Please clarify:",
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    "",
    "Thank you,",
    EMAIL_PLACEHOLDER_NAME,
  ].join("\n");

  return {
    subject,
    body,
    placeholders: Array.from(placeholders),
  };
}

/** Finds placeholder tokens still present in an edited draft. */
export function findRemainingPlaceholders(value: string): string[] {
  return Array.from(new Set(value.match(PLACEHOLDER_PATTERN) ?? []));
}
