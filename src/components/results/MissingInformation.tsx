import type { MissingInfoItem } from "@/lib/analysis/types";

interface MissingInformationProps {
  items: MissingInfoItem[];
}

export default function MissingInformation({ items }: MissingInformationProps) {
  return (
    <section
      aria-labelledby="missing-info-heading"
      className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 id="missing-info-heading" className="text-lg font-semibold text-gray-900">
        Missing or unidentified information
      </h2>
      <p className="mt-1 text-xs text-gray-600">
        These checks only inspect the supplied excerpt, not the complete recruitment
        process. Missing details are not automatically a warning sign.
      </p>

      {items.length === 0 ? (
        <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          No missing information was identified in the supplied text.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <div key={`${item.field}-${index}`} className="rounded-md border border-gray-200 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-gray-900">{item.field}</p>
                <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-800">
                  Not identified
                </span>
                <span className="text-xs text-gray-600">
                  Source: {item.source === "ai" ? "AI review" : "Rule-based check"}
                </span>
              </div>
              <p className="mt-1 font-medium text-gray-900">
                Not identified in the supplied text — please review.
              </p>
              <p className="mt-1 text-gray-700">{item.note}</p>
              <p className="mt-1 text-xs text-gray-600">
                No quotation is shown because this information was not found in the text.
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
