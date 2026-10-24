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
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="review-summary-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Review summary
          </h2>
          <p
            role="status"
            aria-live="polite"
            className="mt-2 text-2xl font-semibold text-gray-900 sm:text-3xl"
          >
            {result.label}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-700">{result.modeLabel}</p>
        </div>
        <p className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
          {findingCountLabel(result.findings.length)}
        </p>
      </div>

      <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-950">
        {LIMITATION_GENUINE}
      </p>

      {result.mode === "ai-unavailable" ? (
        <p className="mt-3 text-sm text-gray-700">
          The rule-based results below are complete. The optional AI review could not
          be completed, so no AI findings are shown.
        </p>
      ) : null}

      {result.mode === "ai-partial" ? (
        <p className="mt-3 text-sm text-gray-700">
          Some AI output could not be validated against the supplied text and was
          omitted. The results below include everything that passed validation.
        </p>
      ) : null}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-900">What was checked</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
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

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-900">Analysis limitations</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          {result.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
