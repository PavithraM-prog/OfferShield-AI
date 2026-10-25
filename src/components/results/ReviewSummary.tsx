import {
  LIMITATION_GENUINE,
  type AnalysisResult,
} from "@/lib/analysis/types";

interface ReviewSummaryProps {
  result: AnalysisResult;
}

function findingCountLabel(count: number): string {
  if (count === 0) {
    return "No evidence-backed findings were flagged.";
  }
  return `${count} finding${count === 1 ? "" : "s"} require${
    count === 1 ? "s" : ""
  } your review.`;
}

export default function ReviewSummary({ result }: ReviewSummaryProps) {
  const aiAssisted = result.mode === "rule-and-ai" || result.mode === "ai-partial";

  return (
    <section
      aria-labelledby="review-summary-heading"
      className="surface relative overflow-hidden rounded-3xl p-5 sm:p-7"
    >
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2
            id="review-summary-heading"
            className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600"
          >
            Review summary
          </h2>
          <p
            role="status"
            aria-live="polite"
            className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl"
          >
            {result.label}
          </p>
          <p className="mt-2 text-base font-medium text-slate-600">{result.modeLabel}</p>
        </div>
        <p className="w-fit shrink-0 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-base font-semibold text-indigo-900">
          {findingCountLabel(result.findings.length)}
        </p>
      </div>

      <p className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm font-medium leading-6 text-amber-950">
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700"
          aria-hidden="true"
        >
          !
        </span>
        <span>{LIMITATION_GENUINE}</span>
      </p>

      {result.mode === "ai-unavailable" ? (
        <p className="mt-3 text-base leading-7 text-slate-600">
          The rule-based results below are complete. The optional AI review could not
          be completed, so no AI findings are shown.
        </p>
      ) : null}

      {result.mode === "ai-partial" ? (
        <p className="mt-3 text-base leading-7 text-slate-600">
          Some AI output could not be validated against the supplied text and was
          omitted. The results below include everything that passed validation.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="surface-muted rounded-2xl p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">What was checked</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base leading-7 text-slate-600">
            <li>Requests for money or deposits tied to obtaining or confirming a role.</li>
            <li>Requests to disclose OTPs, passwords, or PINs.</li>
            <li>Explicit pressure or short-deadline wording.</li>
            <li>
              Sender domain compared with the user-supplied employer website, when both
              were provided.
            </li>
            <li>Company, role, responsibilities, and contact details in the supplied text.</li>
            {aiAssisted ? (
              <li>
                AI candidate findings, kept only when the model supplied a quotation that
                matched the reviewed text exactly.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="surface-muted rounded-2xl p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">Analysis limitations</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base leading-7 text-slate-600">
            {result.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
