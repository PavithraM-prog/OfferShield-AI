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
      className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 id="contact-comparisons-heading" className="text-lg font-semibold text-gray-900">
        Contact-detail comparisons
      </h2>
      <p className="mt-1 text-xs text-gray-600">
        These values come from optional form fields, not from the offer text. The
        claimed employer website is supplied by you and is not verified.
      </p>

      {comparisons.length === 0 ? (
        <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          No domain comparison was run. Provide both a valid sender email and a claimed
          employer website to compare their domains.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {comparisons.map((comparison, index) => (
            <div key={index} className="rounded-md border border-gray-200 p-3 text-sm">
              <dl className="space-y-1">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-gray-900">Sender email:</dt>
                  <dd className="break-all text-gray-700">
                    {senderEmail.length > 0 ? senderEmail : "Not provided"}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-gray-900">Sender domain:</dt>
                  <dd className="break-all text-gray-700">
                    {comparison.senderDomain ?? "Not identified"}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-gray-900">
                    Claimed employer website (user-supplied, unverified):
                  </dt>
                  <dd className="break-all text-gray-700">
                    {employerWebsite.length > 0 ? employerWebsite : "Not provided"}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-gray-900">Claimed employer domain:</dt>
                  <dd className="break-all text-gray-700">
                    {comparison.employerDomain ?? "Not identified"}
                  </dd>
                </div>
              </dl>

              <p className="mt-2 font-medium text-gray-900">
                {comparison.differs
                  ? "The sender domain differs from the claimed employer domain."
                  : "The sender domain matches the claimed employer domain."}
              </p>
              <p className="mt-1 text-gray-700">{comparison.note}</p>
              <p className="mt-1 text-xs text-gray-600">
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
