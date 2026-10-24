import { z } from "zod";
import { MAX_TEXT_LENGTH } from "@/lib/limits/config";

export const SubmitTextSchema = z.object({
  text: z
    .string()
    .min(1, "Please paste the offer text before submitting.")
    .max(MAX_TEXT_LENGTH, `Offer text must be ${MAX_TEXT_LENGTH} characters or fewer.`),
});

const CONTROL_OR_NEWLINE = /[\u0000-\u001f\u007f]/;

const singleLine = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long.`)
    .refine((value) => !CONTROL_OR_NEWLINE.test(value), {
      message: `${label} must be a single line without control characters.`,
    });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_PATTERN = /^[\w-]+(\.[\w-]+)+$/;

export const AnalyzeRequestSchema = z.object({
  text: SubmitTextSchema.shape.text,
  senderEmail: singleLine(320, "Sender email")
    .refine((value) => EMAIL_PATTERN.test(value), {
      message: "Enter a valid sender email address.",
    })
    .optional(),
  employerWebsite: singleLine(2048, "Claimed employer website").refine(
    (value) => /^https?:\/\/\S+$/i.test(value) || DOMAIN_PATTERN.test(value),
    { message: "Enter an http(s) URL or a plain domain name." },
  ).optional(),
  /** Explicit opt-in for sending the reviewed text to the configured AI provider. */
  aiConsent: z.boolean().optional(),
});
