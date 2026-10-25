import type { MissingInfoItem } from "@/lib/analysis/types";

interface MissingInformationProps {
  items: MissingInfoItem[];
}

export default function MissingInformation({ items }: MissingInformationProps) {
  return (
    <section
      aria-labelledby="missing-info-heading"
      className="surface min-w-0 animate-fade-up rounded-3xl p-5 sm:p-6"
    >
      <h2
        id="missing-info-heading"
        className="text-xl font-bold tracking-tight text-slate-950"
      >
        Missing or unidentified information
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        These checks only inspect the supplied excerpt, not the complete recruitment
        process. Missing details are not automatically a warning sign.
      </p>

      {items.length === 0 ? (
        <p className="surface-muted mt-4 rounded-2xl p-4 text-base leading-7 text-slate-600">
          No missing information was identified in the supplied text.
        </p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {items.map((item, index) => (
            <div
              key={`${item.field}-${index}`}
              className="surface-muted rounded-2xl border p-4 text-base leading-7"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-slate-950">{item.field}</p>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-800">
                  Not identified
                </span>
                <span className="text-sm text-slate-500">
                  Source: {item.source === "ai" ? "AI review" : "Rule-based check"}
                </span>
              </div>
              <p className="mt-2 font-semibold text-slate-900">
                Not identified in the supplied text — please review.
              </p>
              <p className="mt-1 text-slate-600">{item.note}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                No quotation is shown because this information was not found in the text.
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
