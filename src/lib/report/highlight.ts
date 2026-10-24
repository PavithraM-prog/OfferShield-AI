export interface HighlightRange {
  id: string;
  start: number;
  end: number;
}

export interface HighlightSegment {
  start: number;
  end: number;
  text: string;
  /** Every evidence range that covers this segment. */
  findingIds: string[];
  /** True when the selected finding covers this segment. */
  selected: boolean;
}

/**
 * Splits the original text into non-overlapping segments so evidence ranges can
 * be rendered persistently. Offsets are taken as given (they were validated
 * against the original text), so repeated quotations highlight the correct
 * occurrence and no normalization is applied.
 */
export function buildHighlightSegments(
  text: string,
  ranges: HighlightRange[],
  selectedId: string | null,
): HighlightSegment[] {
  const safeRanges = ranges
    .filter(
      (range) =>
        Number.isInteger(range.start) &&
        Number.isInteger(range.end) &&
        range.start >= 0 &&
        range.end <= text.length &&
        range.end > range.start,
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (text.length === 0) {
    return [];
  }

  if (safeRanges.length === 0) {
    return [
      {
        start: 0,
        end: text.length,
        text,
        findingIds: [],
        selected: false,
      },
    ];
  }

  const boundaries = new Set<number>([0, text.length]);
  for (const range of safeRanges) {
    boundaries.add(range.start);
    boundaries.add(range.end);
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const segments: HighlightSegment[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (end <= start) {
      continue;
    }
    const covering = safeRanges.filter(
      (range) => range.start < end && start < range.end,
    );
    segments.push({
      start,
      end,
      text: text.slice(start, end),
      findingIds: covering.map((range) => range.id),
      selected:
        selectedId !== null && covering.some((range) => range.id === selectedId),
    });
  }

  return segments;
}
