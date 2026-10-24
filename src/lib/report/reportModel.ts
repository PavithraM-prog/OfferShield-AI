import type { AnalysisResult } from "@/lib/analysis/types";

export interface ReportSnapshot {
  /** UTC timestamp, formatted for display in the printable report. */
  generatedAt: string;
  includeSourceText: boolean;
  /** Null unless the user explicitly asked to include the complete text. */
  sourceText: string | null;
  result: AnalysisResult;
  senderEmail: string;
  employerWebsite: string;
}

export interface BuildReportInput {
  result: AnalysisResult;
  analyzedText: string;
  senderEmail?: string;
  employerWebsite?: string;
  includeSourceText: boolean;
  now?: Date;
}

function formatTimestamp(date: Date): string {
  return `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

/**
 * Creates the immutable data used by the printable report.
 *
 * The complete source text is excluded unless the caller deliberately opted in.
 * The snapshot contains no credentials, API errors, prompts, or debug data.
 */
export function buildReportSnapshot(input: BuildReportInput): ReportSnapshot {
  return {
    generatedAt: formatTimestamp(input.now ?? new Date()),
    includeSourceText: input.includeSourceText,
    sourceText: input.includeSourceText ? input.analyzedText : null,
    result: input.result,
    senderEmail: (input.senderEmail ?? "").trim(),
    employerWebsite: (input.employerWebsite ?? "").trim(),
  };
}
