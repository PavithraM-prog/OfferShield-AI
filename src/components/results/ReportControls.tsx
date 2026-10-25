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
      className="surface animate-fade-up rounded-3xl p-5 sm:p-6"
    >
      <h2
        id="report-controls-heading"
        className="text-xl font-bold tracking-tight text-slate-950"
      >
        Print report
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Opens your browser&apos;s print dialog, where you can print or save as PDF.
        OfferShield does not generate or download a PDF file itself.
      </p>

      <div className="surface-muted mt-4 rounded-2xl border p-4">
        <label
          htmlFor="include-source-text"
          className="flex items-start gap-3 text-base font-medium text-slate-800"
        >
          <input
            id="include-source-text"
            type="checkbox"
            checked={includeSourceText}
            onChange={(event) => onToggleIncludeSourceText(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          />
          <span>Include the complete reviewed text in the report</span>
        </label>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Off by default. The report always contains quotations and review details, which
          can still include personal data even when the full text is excluded.
        </p>
      </div>

      <button
        type="button"
        onClick={onPrint}
        disabled={disabled}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-5 py-2.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 sm:w-auto"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M7 9V4h10v5M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2M7 14h10v6H7v-6z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Print / Save as PDF
      </button>

      <p role="status" aria-live="polite" className="mt-2 text-sm leading-6 text-slate-500">
        {message ?? ""}
      </p>
    </section>
  );
}
