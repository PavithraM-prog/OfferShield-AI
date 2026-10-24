import { z } from "zod";

/**
 * Strict schema for untrusted model output. Unknown properties (for example a
 * model-generated "verdict" or probability score) make the whole response
 * invalid instead of being silently accepted.
 */

const nullableText = (max: number) =>
  z.string().trim().min(1).max(max).nullable();

const quotedText = z
  .string()
  .min(1)
  .max(500)
  .refine((value) => value.trim().length > 0, "Evidence quote must not be blank.");

export const AiCandidateFindingSchema = z.strictObject({
  category: z.enum(["PAYMENT", "SECURITY", "PRESSURE", "OTHER"]),
  title: z.string().trim().min(1).max(120),
  quote: quotedText,
  explanation: z.string().trim().min(1).max(600),
  nextStep: z.string().trim().min(1).max(300),
});

export const AiExtractedFieldsSchema = z.strictObject({
  claimedCompanyName: nullableText(200),
  roleTitle: nullableText(200),
  responsibilities: z.array(z.string().trim().min(1).max(300)).max(10).nullable(),
  contactInformation: z.array(z.string().trim().min(1).max(200)).max(10).nullable(),
  paymentRequest: z
    .strictObject({
      statedPurpose: nullableText(300),
    })
    .nullable(),
  deadlineOrPressure: nullableText(300),
  sensitiveCredentialRequests: nullableText(300),
  additionalConcerns: z.array(z.string().trim().min(1).max(300)).max(10).nullable(),
});

export const AiMissingOrUncertainSchema = z.strictObject({
  field: z.string().trim().min(1).max(80),
  note: z.string().trim().min(1).max(300),
});

export const AiAnalysisOutputSchema = z.strictObject({
  extracted: AiExtractedFieldsSchema,
  candidateFindings: z.array(AiCandidateFindingSchema).max(10),
  missingOrUncertain: z.array(AiMissingOrUncertainSchema).max(10),
  suggestedVerificationActions: z.array(z.string().trim().min(1).max(300)).max(10),
});

export type AiCandidateFinding = z.infer<typeof AiCandidateFindingSchema>;
export type AiExtractedFields = z.infer<typeof AiExtractedFieldsSchema>;
export type AiAnalysisOutput = z.infer<typeof AiAnalysisOutputSchema>;

export type AiParseFailureReason = "MALFORMED_JSON" | "SCHEMA_INVALID";

export type AiParseResult =
  | { ok: true; output: AiAnalysisOutput }
  | { ok: false; reason: AiParseFailureReason };

function stripJsonFence(value: string): string {
  if (!value.startsWith("```") || !value.endsWith("```")) {
    return value;
  }
  const inner = value.slice(3, -3);
  // Drop an optional language tag such as "json" on the first line.
  return inner.replace(/^[a-zA-Z0-9_-]*\s*\n/, "").trim();
}

export function parseAiAnalysisOutput(content: string): AiParseResult {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "MALFORMED_JSON" };
  }

  let json: unknown;
  try {
    json = JSON.parse(stripJsonFence(trimmed));
  } catch {
    return { ok: false, reason: "MALFORMED_JSON" };
  }

  const parsed = AiAnalysisOutputSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, reason: "SCHEMA_INVALID" };
  }

  return { ok: true, output: parsed.data };
}
