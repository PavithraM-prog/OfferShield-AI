"use client";

import {
  FINDING_CATEGORY_LABELS,
  type Finding,
  type ReviewPriority,
} from "@/lib/analysis/types";
import { BASIS_LABELS } from "@/lib/report/labels";

const PRIORITY_CLASSES: Record<ReviewPriority, string> = {
  HIGH: "border-red-300 bg-red-50 text-red-900",
  MEDIUM: "border-amber-300 bg-amber-50 text-amber-900",
  LOW: "border-gray-300 bg-gray-50 text-gray-800",
};

const PRIORITY_LABELS: Record<ReviewPriority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

interface FindingCardProps {
  finding: Finding;
  selected: boolean;
  onSelect: (finding: Finding) => void;
}

export default function FindingCard({ finding, selected, onSelect }: FindingCardProps) {
  const titleId = `finding-${finding.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      data-finding-id={finding.id}
      data-selected={selected ? "true" : undefined}
      className={`rounded-lg border p-4 transition-colors ${
        selected
          ? "border-gray-900 bg-yellow-50 ring-2 ring-gray-900 ring-offset-1"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-gray-800">
          {FINDING_CATEGORY_LABELS[finding.category]}
        </span>
        <span className={`rounded-full border px-2 py-0.5 ${PRIORITY_CLASSES[finding.priority]}`}>
          Review priority: {PRIORITY_LABELS[finding.priority]}
        </span>
        <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-gray-700">
          Source: {BASIS_LABELS[finding.basis]}
        </span>
        {selected ? (
          <span className="rounded-full border border-gray-900 bg-gray-900 px-2 py-0.5 text-white">
            Selected
          </span>
        ) : null}
      </div>

      <h4 id={titleId} className="mt-3 text-base font-semibold text-gray-900">
        {finding.title}
      </h4>

      <blockquote className="mt-3 border-l-4 border-gray-900 bg-gray-50 py-2 pl-3 pr-2 text-sm text-gray-900">
        <mark className="rounded-sm bg-yellow-100 px-0.5 underline decoration-dotted decoration-gray-600 underline-offset-2">
          {finding.quote}
        </mark>
      </blockquote>

      <p className="mt-2 text-sm text-gray-700">{finding.explanation}</p>

      <p className="mt-2 text-sm text-gray-700">
        <span className="font-semibold text-gray-900">Suggested next action:</span>{" "}
        {finding.nextStep}
      </p>

      <p className="mt-2 text-xs text-gray-500">
        Evidence offsets: characters {finding.start}–{finding.end}
      </p>

      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Show evidence for "${finding.title}" in the source text`}
        onClick={() => onSelect(finding)}
        className="mt-3 min-h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 hover:bg-gray-50"
      >
        {selected ? "Selected in source text" : "Show in source text"}
      </button>
    </article>
  );
}
