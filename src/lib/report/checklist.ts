import {
  FINDING_CATEGORY_LABELS,
  type AnalysisResult,
} from "@/lib/analysis/types";

export interface ChecklistItem {
  /** Stable id; used only for local React state, never persisted. */
  id: string;
  action: string;
  rationale: string;
  /** The finding this action came from, or null for a general step. */
  findingId: string | null;
  source: "finding" | "general";
}

/**
 * Builds the verification checklist from validated findings plus a small,
 * clearly labelled set of general steps.
 *
 * These are actions for the reader. A checked box records the reader's own
 * progress and must never be treated as verification by OfferShield.
 */
export function buildVerificationChecklist(result: AnalysisResult): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const seenActions = new Set<string>();

  const add = (item: ChecklistItem): void => {
    const key = item.action.trim().toLowerCase();
    if (key.length === 0 || seenActions.has(key)) {
      return;
    }
    seenActions.add(key);
    items.push(item);
  };

  for (const finding of result.findings) {
    add({
      id: `finding:${finding.id}`,
      action: finding.nextStep,
      rationale: `Relevant because the review flagged ${FINDING_CATEGORY_LABELS[
        finding.category
      ].toLowerCase()}: ${finding.title}.`,
      findingId: finding.id,
      source: "finding",
    });
  }

  if (result.findings.some((finding) => finding.category === "PAYMENT")) {
    add({
      id: "general:payment",
      action: "Ask for written clarification about the stated payment requirement.",
      rationale:
        "The message mentions money. Ask what the payment is for and whether it is required at all.",
      findingId: null,
      source: "general",
    });
  }

  if (result.findings.some((finding) => finding.category === "SECURITY")) {
    add({
      id: "general:credentials",
      action: "Do not share OTPs, passwords, or PINs with anyone.",
      rationale:
        "Legitimate recruitment processes do not need these credentials to consider an application.",
      findingId: null,
      source: "general",
    });
  }

  add({
    id: "general:recruiter",
    action: "Independently confirm the recruiter's relationship with the employer.",
    rationale:
      "Use contact details from the employer's official website, not details supplied in the message.",
    findingId: null,
    source: "general",
  });

  add({
    id: "general:role",
    action: "Confirm the role, responsibilities, supervisor, and recruitment process.",
    rationale:
      "The supplied excerpt may not describe the complete hiring process or the people involved.",
    findingId: null,
    source: "general",
  });

  if (result.contactComparisons.some((comparison) => comparison.differs)) {
    add({
      id: "general:domain",
      action:
        "Compare the sender domain with the employer's official domain and start a new conversation through the official site.",
      rationale:
        "A difference is not proof of impersonation, but official contact details are safer than details taken from the message.",
      findingId: null,
      source: "general",
    });
  }

  if (result.missingInfo.length > 0) {
    add({
      id: "general:missing",
      action: "Ask the employer to clarify the information listed as missing.",
      rationale:
        "The review only inspected the supplied text; missing details are not automatically a warning sign.",
      findingId: null,
      source: "general",
    });
  }

  return items;
}
