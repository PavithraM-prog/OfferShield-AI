"use client";

import { useEffect, useRef, type RefObject } from "react";
import TextInput from "@/components/TextInput";
import type { Finding } from "@/lib/analysis/types";
import { buildHighlightSegments, type HighlightRange } from "@/lib/report/highlight";

export type SourceView = "evidence" | "edit";

interface SourceTextPanelProps {
  text: string;
  findings: Finding[];
  selectedFindingId: string | null;
  view: SourceView;
  hasResult: boolean;
  disabled?: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onViewChange: (view: SourceView) => void;
  onTextChange: (value: string) => void;
}

const tabButtonClass =
  "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2";

export default function SourceTextPanel({
  text,
  findings,
  selectedFindingId,
  view,
  hasResult,
  disabled,
  textareaRef,
  onViewChange,
  onTextChange,
}: SourceTextPanelProps) {
  const evidenceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (view !== "evidence" || selectedFindingId === null) {
      return;
    }
    const container = evidenceRef.current;
    if (!container) {
      return;
    }
    const selected = container.querySelector('[data-selected-evidence="true"]');
    if (selected instanceof HTMLElement) {
      if (typeof selected.scrollIntoView === "function") {
        selected.scrollIntoView({ block: "center" });
      } else {
        container.scrollTop = Math.max(
          0,
          selected.offsetTop - container.clientHeight / 2,
        );
      }
    }
  }, [selectedFindingId, view]);

  const ranges: HighlightRange[] = findings.map((finding) => ({
    id: finding.id,
    start: finding.start,
    end: finding.end,
  }));
  const segments = buildHighlightSegments(text, ranges, selectedFindingId);

  return (
    <section
      aria-labelledby="source-text-heading"
      className="surface min-w-0 animate-fade-up overflow-hidden rounded-3xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 p-4 sm:p-5">
        <div className="min-w-0">
          <h2
            id="source-text-heading"
            className="text-xl font-bold tracking-tight text-slate-950"
          >
            Reviewed text
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {view === "evidence"
              ? "Highlighted passages are exact quotations that passed evidence validation."
              : "Changing this text clears the current review, checklist, and email draft."}
          </p>
        </div>
        <div
          role="group"
          aria-label="Text view"
          className="flex gap-1 rounded-xl bg-slate-100 p-1"
        >
          <button
            type="button"
            aria-pressed={view === "evidence"}
            disabled={!hasResult}
            onClick={() => onViewChange("evidence")}
            className={`${tabButtonClass} ${
              view === "evidence"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            } disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:text-slate-400`}
          >
            Evidence view
          </button>
          <button
            type="button"
            aria-pressed={view === "edit"}
            onClick={() => onViewChange("edit")}
            className={`${tabButtonClass} ${
              view === "edit"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Edit text
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div
          ref={evidenceRef}
          tabIndex={0}
          role="region"
          aria-label="Reviewed offer text with evidence highlighting"
          className={`max-h-[36rem] overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-base leading-8 text-slate-900 shadow-inner shadow-slate-900/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 sm:p-5 ${
            view === "evidence" ? "" : "hidden"
          }`}
        >
          {text.length === 0 ? (
            <p className="text-slate-500">No reviewed text is available.</p>
          ) : (
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
              {segments.map((segment) =>
                segment.findingIds.length > 0 ? (
                  <mark
                    key={`${segment.start}-${segment.end}`}
                    data-evidence-ids={segment.findingIds.join(" ")}
                    data-evidence-start={segment.start}
                    data-selected-evidence={segment.selected ? "true" : undefined}
                    className={
                      segment.selected
                        ? "rounded-md bg-amber-200 px-1 font-semibold text-slate-950 outline outline-2 outline-offset-2 outline-amber-500"
                        : "rounded-md bg-amber-100 px-1 text-slate-950 underline decoration-dotted decoration-slate-500 underline-offset-2"
                    }
                  >
                    {segment.text}
                  </mark>
                ) : (
                  <span key={`${segment.start}-${segment.end}`}>{segment.text}</span>
                ),
              )}
            </p>
          )}
        </div>

        <div className={view === "edit" ? "" : "hidden"}>
          <TextInput
            id="offer-text-review"
            label="Edited offer text"
            value={text}
            onChange={onTextChange}
            ref={textareaRef}
            disabled={disabled}
            rows={16}
          />
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The reviewed text is the version that was sent for analysis. Editing it
            invalidates existing results and drafts.
          </p>
        </div>
      </div>
    </section>
  );
}
