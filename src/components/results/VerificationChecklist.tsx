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

  return (
    <section
      aria-labelledby="checklist-heading"
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="checklist-heading" className="text-lg font-semibold text-gray-900">
          Verification checklist
        </h2>
        <p aria-live="polite" className="text-sm font-medium text-gray-700">
          {checkedCount} of {items.length} marked complete by you
        </p>
      </div>

      <p className="mt-1 text-sm text-gray-700">
        These are actions for you. Checking a box only records your own progress: it does
        not mean OfferShield verified the employer, and it does not change the review
        result.
      </p>

      {items.length === 0 ? (
        <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          No checklist actions were generated for this review.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => {
            const id = controlId(item.id);
            const checked = checkedIds.includes(item.id);
            return (
              <li
                key={item.id}
                className={`rounded-md border p-3 ${
                  checked ? "border-gray-400 bg-gray-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onToggle(item.id, event.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 rounded border-gray-400 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor={id}
                      className="block cursor-pointer text-sm font-semibold text-gray-900"
                    >
                      {item.action}
                    </label>
                    <p className="mt-1 text-sm text-gray-700">{item.rationale}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-gray-600">
                        {item.source === "finding"
                          ? "Derived from a flagged finding"
                          : "General verification step"}
                      </span>
                      {item.findingId ? (
                        <button
                          type="button"
                          onClick={() => onSelectFinding(item.findingId as string)}
                          className="min-h-9 rounded-md px-1 py-1 text-xs font-semibold text-gray-900 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
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

      <p className="mt-3 text-xs text-gray-600">
        Progress is kept only in this page and resets when the offer text, contact fields,
        or AI setting change.
      </p>
    </section>
  );
}
