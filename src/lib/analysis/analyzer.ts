import {
  LIMITATION_GENUINE,
  LIMITATION_RULE_ONLY,
  OVERALL_LABELS,
  REVIEW_MODES,
  REVIEW_MODE_LABELS,
  type AnalysisResult,
  type ContactComparison,
  type Finding,
  type FindingCategory,
  type MissingInfoItem,
  type OverallLabel,
  type ReviewPriority,
} from "@/lib/analysis/types";
import { selectOverallLabel } from "@/lib/analysis/labels";

export interface AnalyzeContacts {
  senderEmail?: string;
  employerWebsite?: string;
}

export const ANALYSIS_BASIS_RULE = "rule";

const PAYMENT_PATTERNS: RegExp[] = [
  /\bpay\b[^.;]{0,60}\b(?:registration|joining|processing|background|training|security|document|clearance|certification|admin|fee|fees|recruitment)\b/i,
  /\b(?:transfer|wire|credit|send|make|submit|process|pay)\b[^.;]{0,60}\bdeposit\b/i,
];

const NEGATION_PATTERNS: RegExp[] = [
  /\bno\b[^.;]{0,60}\b(?:registration|joining|processing|background|training|security|document|clearance|certification|admin|fee|fees|recruitment)\b/i,
  /\bdo\s+not\s+(?:pay|transfer|send|wire|credit|make|submit|process|handle|authorize|approve|provide|disclose|share|text|forward|reply)\b/i,
];

const SECURITY_PATTERNS: RegExp[] = [
  /\b(?:share|send|provide|disclose|give|text|forward|reply|post|store|save|enter|transmit|convey)\b[^.;]{0,50}\b(?:otp|one[-\s]?time[-\s]?code|one_time_code|one-time-code|password|pin|passcode|secret|credentials|token)\b/i,
];

const SECURITY_NEGATION_PATTERNS: RegExp[] = [
  /\b(?:do|does|did|will|would|should|must|can|may)\s+not\s+(?:share|send|provide|disclose|give|text|forward|reply|store|save|enter|transmit|convey|provide)\b/i,
];

const PRESSURE_PATTERNS: RegExp[] = [
  /\b(?:immediately|urgently|right\s+away|asap|act\s+now|don't\s+wait|do\s+not\s+wait|hurry|time[-\s]?sensitive|expiring|last\s+chance|final\s+day|closing\s+window|panic|emergency|without\s+(?:delay|hesitation))\b/i,
];

const COMPANY_RE = /\b(?:company|corporation|incorporated|ltd|limited|llc|corp|co|labs|technologies|systems|group|partners|studios|university|institute|agency|recruitment|staffing|consulting|soluciones|digital|software|works|enterprises|enterprise|holdings|global|international|americas|europe|asia|apac|emea|plc)\b/i;

const ROLE_RE = /\b(?:intern|internship|engineer|developer|analyst|manager|specialist|coordinator|assistant|associate|trainee|resident|fellow|apprentice|summer|co-op|coop|graduate|junior|senior|lead|head|scientist|researcher|designer|product|marketing|sales|support|operations|admin|officer|director|founder|owner|employee|team|department|group)\b/i;

const RESPONSIBILITY_RE = /\b(?:responsibilit|duty|task|scope|okr|kpi|work|build|design|develop|test|ship|maintain|support|deliver|owner|account|assignment|function)/i;

const CONTACT_RE = /\b(?:contact|email|phone|reply|respond|call|whatsapp|telegram|signal|linkedin|reach|message|inquir)|@/i;

function splitSentences(text: string): Array<{ text: string; start: number; end: number }> {
  const result: Array<{ text: string; start: number; end: number }> = [];
  const re = /[^.!?]+[.!?]*/g;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    result.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  if (result.length === 0) {
    result.push({ text, start: 0, end: text.length });
  }
  return result;
}

function domainOf(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  try {
    const url = new URL(trimmed);
    if (url.hostname) {
      return url.hostname.toLowerCase();
    }
  } catch {
    // Not a parsable URL; fall through to plain-domain handling.
  }
  if (/^[\w-]+(\.[\w-]+)+$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function analyzeOffer(text: string, contacts?: AnalyzeContacts): AnalysisResult {
  const trimmed = text.trim();

  const emptyResult: AnalysisResult = {
    label: OVERALL_LABELS.UNABLE_TO_COMPLETE_ANALYSIS,
    mode: REVIEW_MODES.RULE_ONLY,
    modeLabel: REVIEW_MODE_LABELS["rule-only"],
    findings: [],
    contactComparisons: [],
    missingInfo: [],
    extracted: null,
    verificationSteps: [],
    limitations: [
      LIMITATION_RULE_ONLY,
      LIMITATION_GENUINE,
      "The analysis could not run because no offer text was provided.",
    ],
  };

  if (trimmed.length === 0) {
    return emptyResult;
  }

  const findings: Finding[] = [];
  const contactComparisons: ContactComparison[] = [];
  const missingInfo: MissingInfoItem[] = [];
  const verificationSteps: string[] = [];

  const pushFinding = (
    category: FindingCategory,
    priority: ReviewPriority,
    title: string,
    quote: string,
    start: number,
    end: number,
    explanation: string,
    nextStep: string,
  ): void => {
    findings.push({
      id: `${category}-${String(findings.filter((f) => f.category === category).length + 1).padStart(3, "0")}`,
      category,
      priority,
      title,
      quote,
      start,
      end,
      explanation,
      nextStep,
      basis: ANALYSIS_BASIS_RULE,
    });
  };

  const sentences = splitSentences(text);
  for (const sentence of sentences) {
    for (const re of PAYMENT_PATTERNS) {
      const m = re.exec(sentence.text);
      if (m === null) continue;
      const start = sentence.start + m.index;
      const end = start + m[0].length;
      const ctx = sentence.text.slice(0, m.index + m[0].length);
      if (NEGATION_PATTERNS.some((n) => n.test(ctx))) continue;
      pushFinding(
        "PAYMENT",
        "HIGH",
        "Explicit payment request tied to role confirmation",
        text.slice(start, end),
        start,
        end,
        "The offer text contains an explicit request for money tied to obtaining or confirming the role.",
        "Do not send funds outside documented employer channels; ask the sender for written confirmation of any fee or deposit.",
      );
    }
  }

  for (const sentence of sentences) {
    for (const re of SECURITY_PATTERNS) {
      const m = re.exec(sentence.text);
      if (m === null) continue;
      const start = sentence.start + m.index;
      const end = start + m[0].length;
      const ctx = sentence.text.slice(0, m.index + m[0].length);
      if (SECURITY_NEGATION_PATTERNS.some((n) => n.test(ctx))) continue;
      pushFinding(
        "SECURITY",
        "HIGH",
        "Request to disclose OTP, password, or PIN",
        text.slice(start, end),
        start,
        end,
        "The offer text asks for sensitive credentials such as an OTP, password, or PIN.",
        "Never share OTPs, passwords, or PINs; verify identity through official employer channels.",
      );
    }
  }

  for (const sentence of sentences) {
    for (const re of PRESSURE_PATTERNS) {
      const m = re.exec(sentence.text);
      if (m === null) continue;
      const start = sentence.start + m.index;
      const end = start + m[0].length;
      pushFinding(
        "PRESSURE",
        "MEDIUM",
        "Explicit pressure or short-deadline language",
        text.slice(start, end),
        start,
        end,
        "The offer text contains explicit pressure or short-deadline language. Urgency alone does not establish fraud.",
        "Verify the deadline or pressure context through official channels before acting.",
      );
    }
  }

  const senderEmail = contacts?.senderEmail?.trim();
  const employerWebsite = contacts?.employerWebsite?.trim();
  const senderDomain = senderEmail && isValidEmail(senderEmail) ? domainOf(senderEmail.split("@")[1] ?? "") : null;
  const employerDomain = employerWebsite ? domainOf(employerWebsite) : null;
  const hasValidSenderDomain = senderDomain !== null;
  const hasValidEmployerDomain = employerDomain !== null;
  const differs = hasValidSenderDomain && hasValidEmployerDomain && senderDomain !== employerDomain;

  if (hasValidSenderDomain && hasValidEmployerDomain) {
    contactComparisons.push({
      senderDomain,
      employerDomain,
      differs,
      note: differs
        ? "Sender domain and claimed employer website differ. Agencies and recruitment platforms may use other domains than the claimed employer. The supplied employer website is not independently verified; a difference is not proof of impersonation."
        : "Sender domain and claimed employer website match.",
    });
  }

  const missingChecks: Array<{ field: string; isPresent: boolean }> = [
    { field: "Company name", isPresent: COMPANY_RE.test(trimmed) },
    { field: "Role/title", isPresent: ROLE_RE.test(trimmed) },
    { field: "Responsibilities", isPresent: RESPONSIBILITY_RE.test(trimmed) },
    { field: "Contact information", isPresent: CONTACT_RE.test(trimmed) },
  ];

  for (const check of missingChecks) {
    if (!check.isPresent) {
      missingInfo.push({
        field: check.field,
        status: "NOT_IDENTIFIED",
        note: "Not identified in this text — please review. This is a check of the supplied excerpt, not necessarily the complete recruitment process.",
        source: "rule",
      });
    }
  }

  const addVerificationStep = (step: string): void => {
    const alreadyPresent = verificationSteps.some(
      (existing) => existing.toLowerCase() === step.toLowerCase(),
    );
    if (!alreadyPresent) {
      verificationSteps.push(step);
    }
  };

  for (const f of findings) {
    addVerificationStep(f.nextStep);
  }
  if (differs) {
    addVerificationStep("Verify the sender identity and the claimed employer domain through official channels.");
  }
  if (missingInfo.length > 0) {
    addVerificationStep("Clarify missing information directly with the sender or employer.");
  }

  const label: OverallLabel = selectOverallLabel(findings, contactComparisons, missingInfo);

  const analysisResult: AnalysisResult = {
    label,
    mode: REVIEW_MODES.RULE_ONLY,
    modeLabel: REVIEW_MODE_LABELS["rule-only"],
    findings,
    contactComparisons,
    missingInfo,
    extracted: null,
    verificationSteps,
    limitations: [
      LIMITATION_RULE_ONLY,
      LIMITATION_GENUINE,
      "The checks are conservative and may not detect all social engineering patterns.",
    ],
  };

  return analysisResult;
}
