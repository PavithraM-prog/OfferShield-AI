export interface EvidenceMatch {
  start: number;
  end: number;
}

/**
 * Locates exact quotations in the original analyzed text.
 *
 * Offsets are computed with `String.prototype.indexOf` against the original
 * (not normalized) text. Repeated quotations are matched deterministically:
 * each successive request for the same quote searches after the previously
 * matched occurrence. A quote with no remaining occurrence is rejected.
 */
export function createEvidenceMatcher(text: string): (quote: string) => EvidenceMatch | null {
  const nextSearchStart = new Map<string, number>();

  return (quote: string): EvidenceMatch | null => {
    if (quote.length === 0 || quote.trim().length === 0) {
      return null;
    }

    const from = nextSearchStart.get(quote) ?? 0;
    const index = text.indexOf(quote, from);
    if (index === -1) {
      return null;
    }

    nextSearchStart.set(quote, index + quote.length);
    return { start: index, end: index + quote.length };
  };
}
