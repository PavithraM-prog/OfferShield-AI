import {
  OVERALL_LABELS,
  type ContactComparison,
  type Finding,
  type MissingInfoItem,
  type OverallLabel,
} from "@/lib/analysis/types";

/**
 * Code-controlled overall-label policy. The AI provider never chooses the
 * label; its output only contributes validated findings and missing-info
 * entries. A finding of any kind means "Concerning signals found". Otherwise,
 * any domain difference or unidentified information means "Additional
 * verification needed". Only a clean rule result with no additional items
 * reaches "No configured warning signals found".
 */
export function selectOverallLabel(
  findings: Finding[],
  contactComparisons: ContactComparison[],
  missingInfo: MissingInfoItem[],
): OverallLabel {
  if (findings.length > 0) {
    return OVERALL_LABELS.CONCERNING_SIGNALS_FOUND;
  }

  if (contactComparisons.some((comparison) => comparison.differs) || missingInfo.length > 0) {
    return OVERALL_LABELS.ADDITIONAL_VERIFICATION_NEEDED;
  }

  return OVERALL_LABELS.NO_CONFIGURED_WARNING_SIGNALS_FOUND;
}
