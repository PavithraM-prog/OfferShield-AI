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
  "min-h-11 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2";

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
      className="min-w-0 rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
        <div>
          <h2 id="source-text-heading" className="text-lg font-semibold text-gray-900">
            Reviewed text
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            {view === "evidence"
              ? "Highlighted passages are exact quotations that passed evidence validation."
              : "Changing this text clears the current review, checklist, and email draft."}
          </p>
        </div>
        <div role="group" aria-label="Text view" className="flex gap-1 rounded-md bg-gray-100 p-1">
          <button
            type="button"
            aria-pressed={view === "evidence"}
            disabled={!hasResult}
            onClick={() => onViewChange("evidence")}
            className={`${tabButtonClass} ${
              view === "evidence" ? "bg-white text-gray-900 shadow-sm" : "text-gray-700"
            } disabled:cursor-not-allowed disabled:text-gray-400`}
          >
            Evidence view
          </button>
          <button
            type="button"
            aria-pressed={view === "edit"}
            onClick={() => onViewChange("edit")}
            className={`${tabButtonClass} ${
              view === "edit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-700"
            }`}
          >
            Edit text
          </button>
        </div>
      </div>

      <div className="p-4">
        <div
          ref={evidenceRef}
          tabIndex={0}
          role="region"
          aria-label="Reviewed offer text with evidence highlighting"
          className={`max-h-[36rem] overflow-y-auto rounded-md border border-gray-100 bg-gray-50 p-4 text-sm leading-7 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${
            view === "evidence" ? "" : "hidden"
          }`}
        >
          {text.length === 0 ? (
            <p className="text-gray-600">No reviewed text is available.</p>
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
                        ? "rounded-sm bg-yellow-200 px-0.5 font-medium text-gray-900 outline outline-2 outline-offset-2 outline-gray-900"
                        : "rounded-sm bg-yellow-100 px-0.5 text-gray-900 underline decoration-dotted decoration-gray-600 underline-offset-2"
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
          <p className="mt-2 text-xs text-gray-600">
            The reviewed text is the version that was sent for analysis. Editing it
            invalidates existing results and drafts.
          </p>
        </div>
      </div>
    </section>
  );
}
