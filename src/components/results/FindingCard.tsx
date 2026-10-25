"use client";

import {
  FINDING_CATEGORY_LABELS,
  type Finding,
  type ReviewPriority,
} from "@/lib/analysis/types";
import { BASIS_LABELS } from "@/lib/report/labels";

const PRIORITY_CLASSES: Record<ReviewPriority, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-800",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
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
      className={`lift-on-hover rounded-2xl border p-4 transition-all duration-300 ${
        selected
          ? "border-indigo-300 bg-amber-50/80 shadow-lg shadow-amber-900/5 ring-2 ring-indigo-500 ring-offset-2"
          : "border-slate-200 bg-white/90 hover:border-indigo-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
          {FINDING_CATEGORY_LABELS[finding.category]}
        </span>
        <span className={`rounded-full border px-2.5 py-1 ${PRIORITY_CLASSES[finding.priority]}`}>
          Review priority: {PRIORITY_LABELS[finding.priority]}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
          Source: {BASIS_LABELS[finding.basis]}
        </span>
        {selected ? (
          <span className="rounded-full border border-indigo-600 bg-indigo-600 px-2.5 py-1 text-white">
            Selected
          </span>
        ) : null}
      </div>

      <h4 id={titleId} className="mt-3 text-lg font-bold tracking-tight text-slate-950">
        {finding.title}
      </h4>

      <blockquote className="mt-3 rounded-r-xl border-l-4 border-indigo-500 bg-slate-50/90 py-2.5 pl-3 pr-2 text-base leading-7 text-slate-900">
        <mark className="rounded bg-amber-100 px-1 text-slate-950 underline decoration-dotted decoration-slate-500 underline-offset-2">
          {finding.quote}
        </mark>
      </blockquote>

      <p className="mt-3 text-base leading-7 text-slate-600">{finding.explanation}</p>

      <p className="mt-2 text-base leading-7 text-slate-600">
        <span className="font-semibold text-slate-900">Suggested next action:</span>{" "}
        {finding.nextStep}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Evidence offsets: characters {finding.start}–{finding.end}
      </p>

      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Show evidence for "${finding.title}" in the source text`}
        onClick={() => onSelect(finding)}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4"
        >
          <path
            d="M5 12h14m0 0l-5-5m5 5l-5 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {selected ? "Selected in source text" : "Show in source text"}
      </button>
    </article>
  );
}
