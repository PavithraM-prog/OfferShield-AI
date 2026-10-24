"use client";

interface ReportControlsProps {
  includeSourceText: boolean;
  onToggleIncludeSourceText: (value: boolean) => void;
  onPrint: () => void;
  disabled: boolean;
  message: string | null;
}

export default function ReportControls({
  includeSourceText,
  onToggleIncludeSourceText,
  onPrint,
  disabled,
  message,
}: ReportControlsProps) {
  return (
    <section
      aria-labelledby="report-controls-heading"
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 id="report-controls-heading" className="text-lg font-semibold text-gray-900">
        Print report
      </h2>
      <p className="mt-1 text-sm text-gray-700">
        Opens your browser&apos;s print dialog, where you can print or save as PDF.
        OfferShield does not generate or download a PDF file itself.
      </p>

      <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
        <label htmlFor="include-source-text" className="flex items-start gap-2 text-sm font-medium text-gray-900">
          <input
            id="include-source-text"
            type="checkbox"
            checked={includeSourceText}
            onChange={(event) => onToggleIncludeSourceText(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
          />
          <span>Include the complete reviewed text in the report</span>
        </label>
        <p className="mt-2 text-xs text-gray-700">
          Off by default. The report always contains quotations and review details, which
          can still include personal data even when the full text is excluded.
        </p>
      </div>

      <button
        type="button"
        onClick={onPrint}
        disabled={disabled}
        className="mt-4 min-h-11 w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
      >
        Print / Save as PDF
      </button>

      <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-700">
        {message ?? ""}
      </p>
    </section>
  );
}
