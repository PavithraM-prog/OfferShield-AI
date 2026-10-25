"use client";

import type { ChecklistItem } from "@/lib/report/checklist";

interface VerificationChecklistProps {
  items: ChecklistItem[];
  checkedIds: string[];
  onToggle: (itemId: string, checked: boolean) => void;
  onSelectFinding: (findingId: string) => void;
}

function controlId(itemId: string): string {
  return `checklist-${itemId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export default function VerificationChecklist({
  items,
  checkedIds,
  onToggle,
  onSelectFinding,
}: VerificationChecklistProps) {
  const checkedCount = items.filter((item) => checkedIds.includes(item.id)).length;
  const progress = items.length === 0 ? 0 : Math.round((checkedCount / items.length) * 100);

  return (
    <section
      aria-labelledby="checklist-heading"
      className="surface animate-fade-up rounded-3xl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="checklist-heading"
          className="text-xl font-bold tracking-tight text-slate-950"
        >
          Verification checklist
        </h2>
        <p aria-live="polite" className="text-base font-semibold text-indigo-700">
          {checkedCount} of {items.length} marked complete by you
        </p>
      </div>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        These are actions for you. Checking a box only records your own progress: it does
        not mean OfferShield verified the employer, and it does not change the review
        result.
      </p>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {items.length === 0 ? (
        <p className="surface-muted mt-4 rounded-2xl p-4 text-base leading-7 text-slate-600">
          No checklist actions were generated for this review.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map((item) => {
            const id = controlId(item.id);
            const checked = checkedIds.includes(item.id);
            return (
              <li
                key={item.id}
                className={`rounded-2xl border p-3.5 transition-all duration-200 ${
                  checked
                    ? "border-indigo-200 bg-indigo-50/60 shadow-sm"
                    : "border-slate-200 bg-white/80 hover:border-indigo-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onToggle(item.id, event.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor={id}
                      className="block cursor-pointer text-base font-semibold leading-7 text-slate-900"
                    >
                      {item.action}
                    </label>
                    <p className="mt-1 text-base leading-7 text-slate-600">
                      {item.rationale}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <span className="text-sm text-slate-500">
                        {item.source === "finding"
                          ? "Derived from a flagged finding"
                          : "General verification step"}
                      </span>
                      {item.findingId ? (
                        <button
                          type="button"
                          onClick={() => onSelectFinding(item.findingId as string)}
                          className="min-h-9 rounded-lg px-1 py-1 text-sm font-semibold text-indigo-700 underline underline-offset-2 transition-colors hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                        >
                          Show related evidence
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-sm leading-6 text-slate-500">
        Progress is kept only in this page and resets when the offer text, contact fields,
        or AI setting change.
      </p>
    </section>
  );
}
