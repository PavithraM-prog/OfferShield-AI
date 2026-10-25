import type { ContactComparison } from "@/lib/analysis/types";

interface ContactComparisonsProps {
  comparisons: ContactComparison[];
  senderEmail: string;
  employerWebsite: string;
}

export default function ContactComparisons({
  comparisons,
  senderEmail,
  employerWebsite,
}: ContactComparisonsProps) {
  return (
    <section
      aria-labelledby="contact-comparisons-heading"
      className="surface min-w-0 animate-fade-up rounded-3xl p-5 sm:p-6"
    >
      <h2
        id="contact-comparisons-heading"
        className="text-xl font-bold tracking-tight text-slate-950"
      >
        Contact-detail comparisons
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        These values come from optional form fields, not from the offer text. The
        claimed employer website is supplied by you and is not verified.
      </p>

      {comparisons.length === 0 ? (
        <p className="surface-muted mt-4 rounded-2xl p-4 text-base leading-7 text-slate-600">
          No domain comparison was run. Provide both a valid sender email and a claimed
          employer website to compare their domains.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {comparisons.map((comparison, index) => (
            <div
              key={index}
              className="surface-muted rounded-2xl border p-4 text-base leading-7"
            >
              <dl className="space-y-1.5">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-slate-900">Sender email:</dt>
                  <dd className="break-all text-slate-600">
                    {senderEmail.length > 0 ? senderEmail : "Not provided"}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-slate-900">Sender domain:</dt>
                  <dd className="break-all text-slate-600">
                    {comparison.senderDomain ?? "Not identified"}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-slate-900">
                    Claimed employer website (user-supplied, unverified):
                  </dt>
                  <dd className="break-all text-slate-600">
                    {employerWebsite.length > 0 ? employerWebsite : "Not provided"}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-slate-900">Claimed employer domain:</dt>
                  <dd className="break-all text-slate-600">
                    {comparison.employerDomain ?? "Not identified"}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 font-semibold text-slate-900">
                {comparison.differs
                  ? "The sender domain differs from the claimed employer domain."
                  : "The sender domain matches the claimed employer domain."}
              </p>
              <p className="mt-1 text-slate-600">{comparison.note}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                No original-text evidence is shown here. OfferShield did not check domain
                ownership, registration, or reputation, and did not contact anyone.
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
