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
    <section
      aria-labelledby="concerns-heading"
      className="surface min-w-0 animate-fade-up rounded-3xl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="concerns-heading"
          className="text-xl font-bold tracking-tight text-slate-950"
        >
          Evidence-backed concerns
        </h2>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-600">
          {findings.length} flagged
        </span>
      </div>

      {findings.length === 0 ? (
        <div className="surface-muted mt-4 rounded-2xl p-4 text-base leading-7 text-slate-600">
          <p className="font-semibold text-slate-900">
            No evidence-backed findings were flagged.
          </p>
          <p className="mt-1">
            That does not mean the offer is genuine. Review the contact comparisons,
            missing information, and checklist below.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {CATEGORY_ORDER.map((category) => {
            const categoryFindings = findings.filter(
              (finding) => finding.category === category,
            );
            if (categoryFindings.length === 0) {
              return null;
            }
            return (
              <div key={category}>
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-indigo-500"
                    aria-hidden="true"
                  />
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
