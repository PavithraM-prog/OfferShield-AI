"use client";

import FindingCard from "@/components/results/FindingCard";
import {
  FINDING_CATEGORY_LABELS,
  type Finding,
  type FindingCategory,
} from "@/lib/analysis/types";

interface EvidenceConcernsProps {
  findings: Finding[];
  selectedFindingId: string | null;
  onSelect: (finding: Finding) => void;
}

const CATEGORY_ORDER: FindingCategory[] = ["PAYMENT", "SECURITY", "PRESSURE", "OTHER"];

export default function EvidenceConcerns({
  findings,
  selectedFindingId,
  onSelect,
}: EvidenceConcernsProps) {
  return (
    <section aria-labelledby="concerns-heading" className="min-w-0">
      <h2 id="concerns-heading" className="text-lg font-semibold text-gray-900">
        Evidence-backed concerns
      </h2>

      {findings.length === 0 ? (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">No evidence-backed findings were flagged.</p>
          <p className="mt-1">
            That does not mean the offer is genuine. Review the contact comparisons,
            missing information, and checklist below.
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-5">
          {CATEGORY_ORDER.map((category) => {
            const categoryFindings = findings.filter(
              (finding) => finding.category === category,
            );
            if (categoryFindings.length === 0) {
              return null;
            }
            return (
              <div key={category}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                  {FINDING_CATEGORY_LABELS[category]} ({categoryFindings.length})
                </h3>
                <div className="mt-2 space-y-3">
                  {categoryFindings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      selected={selectedFindingId === finding.id}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
