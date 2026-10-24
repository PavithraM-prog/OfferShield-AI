import { describe, expect, it } from "vitest";
import { AnalyzeRequestSchema, SubmitTextSchema } from "@/lib/validation/schemas";
import { MAX_TEXT_LENGTH } from "@/lib/limits/config";

describe("SubmitTextSchema", () => {
  it("accepts text within the character limit", () => {
    const result = SubmitTextSchema.safeParse({
      text: "We are pleased to offer you the role.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty text", () => {
    const result = SubmitTextSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects text exceeding the character limit", () => {
    const result = SubmitTextSchema.safeParse({ text: "a".repeat(MAX_TEXT_LENGTH + 1) });
    expect(result.success).toBe(false);
  });

  it("accepts text exactly at the character limit", () => {
    const result = SubmitTextSchema.safeParse({ text: "a".repeat(MAX_TEXT_LENGTH) });
    expect(result.success).toBe(true);
  });
});

describe("AnalyzeRequestSchema", () => {
  it("accepts text with optional sender and employer details", () => {
    const result = AnalyzeRequestSchema.safeParse({
      text: "We are pleased to offer you the internship at Acme Labs.",
      senderEmail: "recruiter@agency.com",
      employerWebsite: "https://acmelabs.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts text without optional sender and employer details", () => {
    const result = AnalyzeRequestSchema.safeParse({ text: "We are pleased to offer you the internship at Acme Labs." });
    expect(result.success).toBe(true);
  });

  it("rejects empty text", () => {
    const result = AnalyzeRequestSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects text exceeding the character limit", () => {
    const result = AnalyzeRequestSchema.safeParse({ text: "a".repeat(MAX_TEXT_LENGTH + 1) });
    expect(result.success).toBe(false);
  });

  it("accepts an explicit AI consent flag", () => {
    const result = AnalyzeRequestSchema.safeParse({
      text: "We are pleased to offer you the internship at Acme Labs.",
      aiConsent: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-boolean AI consent flag", () => {
    const result = AnalyzeRequestSchema.safeParse({
      text: "We are pleased to offer you the internship at Acme Labs.",
      aiConsent: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed sender email", () => {
    const result = AnalyzeRequestSchema.safeParse({
      text: "We are pleased to offer you the internship at Acme Labs.",
      senderEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a sender email containing a newline", () => {
    const result = AnalyzeRequestSchema.safeParse({
      text: "We are pleased to offer you the internship at Acme Labs.",
      senderEmail: "recruiter@example.com\nBcc: attacker@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a plain domain or an http(s) employer website", () => {
    for (const employerWebsite of [
      "example.com",
      "https://example.com",
      "http://careers.example.co.uk",
    ]) {
      const result = AnalyzeRequestSchema.safeParse({
        text: "We are pleased to offer you the internship at Acme Labs.",
        employerWebsite,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects script URLs and control characters in the employer website", () => {
    for (const employerWebsite of [
      "javascript:alert(1)",
      "https://example.com/\u0000evil",
      "example",
    ]) {
      const result = AnalyzeRequestSchema.safeParse({
        text: "We are pleased to offer you the internship at Acme Labs.",
        employerWebsite,
      });
      expect(result.success).toBe(false);
    }
  });

  it("trims surrounding whitespace from optional contact fields", () => {
    const result = AnalyzeRequestSchema.safeParse({
      text: "We are pleased to offer you the internship at Acme Labs.",
      senderEmail: "  recruiter@example.com  ",
      employerWebsite: "  example.com  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.senderEmail).toBe("recruiter@example.com");
      expect(result.data.employerWebsite).toBe("example.com");
    }
  });
});
