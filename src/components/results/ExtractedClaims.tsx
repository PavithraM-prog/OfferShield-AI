import type { ExtractedClaimedFields } from "@/lib/analysis/types";

interface ExtractedClaimsProps {
  extracted: ExtractedClaimedFields;
}

function listOrFallback(values: string[] | null, fallback: string): string {
  return values && values.length > 0 ? values.join("; ") : fallback;
}

export default function ExtractedClaims({ extracted }: ExtractedClaimsProps) {
  return (
    <section
      aria-labelledby="extracted-claims-heading"
      className="surface min-w-0 animate-fade-up rounded-3xl p-5 sm:p-6"
    >
      <h2
        id="extracted-claims-heading"
        className="text-xl font-bold tracking-tight text-slate-950"
      >
        Extracted claims from the offer (not independently verified)
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        These fields describe claims made in the document. They were not verified against
        any external source.
      </p>

      <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <div className="surface-muted rounded-xl p-3">
          <dt className="text-sm font-semibold text-slate-500">Claimed company name</dt>
          <dd className="mt-0.5 text-base font-medium text-slate-900">
            {extracted.claimedCompanyName ?? "Not stated in the text"}
          </dd>
        </div>
        <div className="surface-muted rounded-xl p-3">
          <dt className="text-sm font-semibold text-slate-500">Role/title</dt>
          <dd className="mt-0.5 text-base font-medium text-slate-900">
            {extracted.roleTitle ?? "Not stated in the text"}
          </dd>
        </div>
        <div className="surface-muted rounded-xl p-3">
          <dt className="text-sm font-semibold text-slate-500">Responsibilities</dt>
          <dd className="mt-0.5 text-base text-slate-800">
            {listOrFallback(extracted.responsibilities, "Not stated in the text")}
          </dd>
        </div>
        <div className="surface-muted rounded-xl p-3">
          <dt className="text-sm font-semibold text-slate-500">
            Contact information mentioned
          </dt>
          <dd className="mt-0.5 text-base text-slate-800">
            {listOrFallback(extracted.contactInformation, "Not stated in the text")}
          </dd>
        </div>
        <div className="surface-muted rounded-xl p-3">
          <dt className="text-sm font-semibold text-slate-500">Payment request</dt>
          <dd className="mt-0.5 text-base text-slate-800">
            {extracted.paymentRequest
              ? (extracted.paymentRequest.statedPurpose ??
                "Present; stated purpose not identified")
              : "No payment request identified"}
          </dd>
        </div>
        <div className="surface-muted rounded-xl p-3">
          <dt className="text-sm font-semibold text-slate-500">
            Deadline or pressure language
          </dt>
          <dd className="mt-0.5 text-base text-slate-800">
            {extracted.deadlineOrPressure ?? "Not identified"}
          </dd>
        </div>
        <div className="surface-muted rounded-xl p-3">
          <dt className="text-sm font-semibold text-slate-500">
            Sensitive credential requests
          </dt>
          <dd className="mt-0.5 text-base text-slate-800">
            {extracted.sensitiveCredentialRequests ?? "Not identified"}
          </dd>
        </div>
        <div className="surface-muted rounded-xl p-3">
          <dt className="text-sm font-semibold text-slate-500">Additional concerns</dt>
          <dd className="mt-0.5 text-base text-slate-800">
            {listOrFallback(extracted.additionalConcerns, "None reported")}
          </dd>
        </div>
      </dl>
    </section>
  );
}
