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
      className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 id="extracted-claims-heading" className="text-lg font-semibold text-gray-900">
        Extracted claims from the offer (not independently verified)
      </h2>
      <p className="mt-1 text-xs text-gray-600">
        These fields describe claims made in the document. They were not verified against
        any external source.
      </p>

      <dl className="mt-3 space-y-2 text-sm text-gray-800">
        <div>
          <dt className="font-semibold text-gray-900">Claimed company name</dt>
          <dd>{extracted.claimedCompanyName ?? "Not stated in the text"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">Role/title</dt>
          <dd>{extracted.roleTitle ?? "Not stated in the text"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">Responsibilities</dt>
          <dd>{listOrFallback(extracted.responsibilities, "Not stated in the text")}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">Contact information mentioned</dt>
          <dd>{listOrFallback(extracted.contactInformation, "Not stated in the text")}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">Payment request</dt>
          <dd>
            {extracted.paymentRequest
              ? (extracted.paymentRequest.statedPurpose ??
                "Present; stated purpose not identified")
              : "No payment request identified"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">Deadline or pressure language</dt>
          <dd>{extracted.deadlineOrPressure ?? "Not identified"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">Sensitive credential requests</dt>
          <dd>{extracted.sensitiveCredentialRequests ?? "Not identified"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">Additional concerns</dt>
          <dd>{listOrFallback(extracted.additionalConcerns, "None reported")}</dd>
        </div>
      </dl>
    </section>
  );
}
