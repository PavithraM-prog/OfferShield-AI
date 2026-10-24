import {
  FINDING_CATEGORY_LABELS,
  LIMITATION_GENUINE,
} from "@/lib/analysis/types";
import { BASIS_LABELS } from "@/lib/report/labels";
import type { ReportSnapshot } from "@/lib/report/reportModel";

interface PrintReportProps {
  snapshot: ReportSnapshot;
}

const headingClass = "mt-6 border-b border-gray-400 pb-1 text-base font-bold";
const sectionClass = "print-avoid-break";

export default function PrintReport({ snapshot }: PrintReportProps) {
  const { result } = snapshot;

  return (
    <div
      data-testid="print-report"
      aria-hidden="true"
      className="print-report mx-auto max-w-4xl bg-white p-6 text-gray-900"
    >
      <header className="border-b-2 border-gray-900 pb-3">
        <h1 className="text-2xl font-bold">OfferShield</h1>
        <p className="text-sm font-semibold">Offer review report</p>
        <p className="mt-1 text-xs">Report generated: {snapshot.generatedAt}</p>
      </header>

      <section className={`${sectionClass} mt-4`}>
        <h2 className={headingClass}>Review summary</h2>
        <p className="mt-2 text-lg font-bold">{result.label}</p>
        <p className="text-sm">Review mode and completion status: {result.modeLabel}</p>
        <p className="mt-1 text-sm">
          Findings requiring review: {result.findings.length}
        </p>
        <p className="mt-2 border border-gray-400 p-2 text-sm font-semibold">
          {LIMITATION_GENUINE}
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Evidence-backed concerns</h2>
        {result.findings.length === 0 ? (
          <p className="mt-2 text-sm">No evidence-backed findings were flagged.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {result.findings.map((finding) => (
              <li key={finding.id} className="print-avoid-break border border-gray-300 p-2 text-sm">
                <p className="font-bold">{finding.title}</p>
                <p className="text-xs">
                  {FINDING_CATEGORY_LABELS[finding.category]} · Review priority:{" "}
                  {finding.priority} · Source: {BASIS_LABELS[finding.basis]}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Exact quotation:</span>{" "}
                  &ldquo;{finding.quote}&rdquo;
                </p>
                <p className="mt-1">{finding.explanation}</p>
                <p className="mt-1">
                  <span className="font-semibold">Suggested next action:</span>{" "}
                  {finding.nextStep}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Contact-detail comparisons</h2>
        <p className="mt-1 text-xs">
          The claimed employer website is user-supplied and unverified. No original-text
          evidence exists for these optional form fields.
        </p>
        {result.contactComparisons.length === 0 ? (
          <p className="mt-2 text-sm">No domain comparison was run.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {result.contactComparisons.map((comparison, index) => (
              <li key={index} className="border border-gray-300 p-2">
                <p>
                  <span className="font-semibold">Sender email:</span>{" "}
                  {snapshot.senderEmail.length > 0 ? snapshot.senderEmail : "Not provided"}
                </p>
                <p>
                  <span className="font-semibold">Sender domain:</span>{" "}
                  {comparison.senderDomain ?? "Not identified"}
                </p>
                <p>
                  <span className="font-semibold">
                    Claimed employer website (user-supplied, unverified):
                  </span>{" "}
                  {snapshot.employerWebsite.length > 0
                    ? snapshot.employerWebsite
                    : "Not provided"}
                </p>
                <p>
                  <span className="font-semibold">Claimed employer domain:</span>{" "}
                  {comparison.employerDomain ?? "Not identified"}
                </p>
                <p>{comparison.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Missing or unidentified information</h2>
        {result.missingInfo.length === 0 ? (
          <p className="mt-2 text-sm">
            No missing information was identified in the supplied text.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {result.missingInfo.map((item, index) => (
              <li key={`${item.field}-${index}`} className="border border-gray-300 p-2">
                <p className="font-bold">{item.field}: not identified in the supplied text</p>
                <p>{item.note}</p>
                <p className="text-xs">
                  Source: {item.source === "ai" ? "AI review" : "Rule-based check"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Suggested verification actions</h2>
        {result.verificationSteps.length === 0 ? (
          <p className="mt-2 text-sm">No verification actions were generated.</p>
        ) : (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {result.verificationSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Analysis limitations</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {result.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Reviewed source text</h2>
        {snapshot.sourceText ? (
          <>
            <p className="mt-1 text-xs">
              Included because you selected the option before printing. This text can
              contain personal data.
            </p>
            <pre className="mt-2 whitespace-pre-wrap break-words border border-gray-300 p-2 text-xs">
              {snapshot.sourceText}
            </pre>
          </>
        ) : (
          <p className="mt-2 text-sm">
            The complete reviewed text was not included. Quotations and other report fields
            can still contain personal data.
          </p>
        )}
      </section>

      <footer className="mt-6 border-t border-gray-400 pt-2 text-xs">
        <p>{LIMITATION_GENUINE}</p>
        <p className="mt-1">
          OfferShield is a limited review tool. It does not verify employers, domains,
          recruiters, or documents, and it does not provide a fraud probability.
        </p>
      </footer>
    </div>
  );
}
