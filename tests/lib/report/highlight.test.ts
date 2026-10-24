import { describe, expect, it } from "vitest";
import { buildHighlightSegments } from "@/lib/report/highlight";

function rebuild(segments: ReturnType<typeof buildHighlightSegments>): string {
  return segments.map((segment) => segment.text).join("");
}

describe("buildHighlightSegments", () => {
  it("reproduces the original text exactly", () => {
    const text = "Hello. Please pay the registration fee.";
    const segments = buildHighlightSegments(
      text,
      [{ id: "A", start: 7, end: 31 }],
      null,
    );

    expect(rebuild(segments)).toBe(text);
  });

  it("marks only the selected finding as selected", () => {
    const text = "pay the fee and then pay the fee";
    const segments = buildHighlightSegments(
      text,
      [
        { id: "A", start: 0, end: 11 },
        { id: "B", start: 21, end: 32 },
      ],
      "B",
    );

    const selected = segments.filter((segment) => segment.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].start).toBe(21);
    expect(selected[0].text).toBe("pay the fee");
    expect(selected[0].findingIds).toContain("B");
    expect(rebuild(segments)).toBe(text);
  });

  it("handles overlapping ranges without duplicating text", () => {
    const text = "pay the registration fee now";
    const segments = buildHighlightSegments(
      text,
      [
        { id: "A", start: 0, end: 24 },
        { id: "B", start: 8, end: 24 },
      ],
      "A",
    );

    expect(rebuild(segments)).toBe(text);
    const overlapping = segments.find((segment) => segment.start === 8);
    expect(overlapping?.findingIds).toEqual(expect.arrayContaining(["A", "B"]));
    expect(overlapping?.selected).toBe(true);
  });

  it("ignores out-of-bounds and empty ranges", () => {
    const text = "short text";
    const segments = buildHighlightSegments(
      text,
      [
        { id: "A", start: -1, end: 3 },
        { id: "B", start: 4, end: 4 },
        { id: "C", start: 100, end: 120 },
      ],
      "A",
    );

    expect(segments).toHaveLength(1);
    expect(segments[0].findingIds).toEqual([]);
    expect(segments[0].selected).toBe(false);
  });

  it("returns no segments for empty text", () => {
    expect(buildHighlightSegments("", [{ id: "A", start: 0, end: 0 }], null)).toEqual([]);
  });
});
