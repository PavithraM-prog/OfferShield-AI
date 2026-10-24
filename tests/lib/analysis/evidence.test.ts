import { describe, expect, it } from "vitest";
import { createEvidenceMatcher } from "@/lib/analysis/evidence";

describe("createEvidenceMatcher", () => {
  it("locates an exact quotation and returns source offsets", () => {
    const text = "Hello. Please pay the registration fee.";
    const locate = createEvidenceMatcher(text);
    const quote = "pay the registration fee";

    const match = locate(quote);

    expect(match).not.toBeNull();
    expect(text.slice(match!.start, match!.end)).toBe(quote);
    expect(match!.start).toBe(text.indexOf(quote));
  });

  it("matches repeated quotations deterministically", () => {
    const text = "pay the fee. pay the fee.";
    const locate = createEvidenceMatcher(text);

    const first = locate("pay the fee");
    const second = locate("pay the fee");
    const third = locate("pay the fee");

    expect(first).toEqual({ start: 0, end: 11 });
    expect(second).toEqual({ start: 13, end: 24 });
    expect(third).toBeNull();
  });

  it("computes offsets correctly with non-ASCII text", () => {
    const text = "Hola. Please pay the registration fee.";
    const quote = "pay the registration fee";

    const match = createEvidenceMatcher(text)(quote);

    expect(match).not.toBeNull();
    expect(match!.start).toBe(text.indexOf(quote));
    expect(text.slice(match!.start, match!.end)).toBe(quote);
  });

  it("rejects blank quotations", () => {
    const locate = createEvidenceMatcher("some text");
    expect(locate("")).toBeNull();
    expect(locate("   ")).toBeNull();
  });

  it("does not normalise text when matching quotations", () => {
    const text = "Please pay  the registration fee.";
    const locate = createEvidenceMatcher(text);
    expect(locate("Please pay the registration fee.")).toBeNull();
  });
});
