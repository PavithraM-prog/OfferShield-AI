"use client";

import { useState } from "react";
import TextInput from "@/components/TextInput";
import { findRemainingPlaceholders } from "@/lib/report/emailDraft";

type CopyTarget = "subject" | "body" | "all";

interface CopyStatus {
  target: CopyTarget;
  ok: boolean;
}

interface VerificationEmailProps {
  subject: string;
  body: string;
  edited: boolean;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onResetDraft: () => void;
}

const COPY_LABELS: Record<CopyTarget, string> = {
  subject: "subject",
  body: "message",
  all: "subject and message",
};

const copyButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2";

export default function VerificationEmail({
  subject,
  body,
  edited,
  onSubjectChange,
  onBodyChange,
  onResetDraft,
}: VerificationEmailProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus | null>(null);
  const remaining = findRemainingPlaceholders(`${subject}\n${body}`);

  async function copyText(target: CopyTarget): Promise<void> {
    const value =
      target === "subject"
        ? subject
        : target === "body"
          ? body
          : `Subject: ${subject}\n\n${body}`;

    try {
      const clipboard =
        typeof navigator !== "undefined" ? navigator.clipboard : undefined;
      if (!clipboard || typeof clipboard.writeText !== "function") {
        setCopyStatus({ target, ok: false });
        return;
      }
      await clipboard.writeText(value);
      setCopyStatus({ target, ok: true });
    } catch {
      setCopyStatus({ target, ok: false });
    }
  }

  const successMessage =
    copyStatus?.ok === true
      ? `Copied the ${COPY_LABELS[copyStatus.target]} to the clipboard.`
      : "";
  const failureMessage =
    copyStatus?.ok === false
      ? `Could not copy the ${COPY_LABELS[copyStatus.target]}. Your browser may block clipboard access; select the text and copy it manually.`
      : "";

  return (
    <section
      aria-labelledby="verification-email-heading"
      className="surface animate-fade-up rounded-3xl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="verification-email-heading"
          className="text-xl font-bold tracking-tight text-slate-950"
        >
          Verification email draft
        </h2>
        <button
          type="button"
          onClick={onResetDraft}
          className="min-h-9 rounded-lg px-1 py-1 text-sm font-semibold text-indigo-700 underline underline-offset-2 transition-colors hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        >
          Reset to suggested draft
        </button>
      </div>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        A factual draft based only on this review. It does not accuse anyone, does not
        claim fraud occurred, and is not sent by OfferShield.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Company, role, and other details used in this draft come from the supplied text or
        the optional AI review. They are not independently verified.
      </p>

      <div className="mt-4">
        <label
          htmlFor="email-subject"
          className="block text-base font-semibold text-slate-800"
        >
          Subject
        </label>
        <input
          id="email-subject"
          type="text"
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          className="field-control mt-2 block p-3 text-base text-slate-900"
        />
      </div>

      <div className="mt-4">
        <TextInput
          id="email-body"
          label="Message body"
          value={body}
          onChange={onBodyChange}
          maxLength={5000}
          rows={14}
        />
      </div>

      {remaining.length > 0 ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-sm leading-6 text-amber-950">
          Replace the placeholder{remaining.length === 1 ? "" : "s"}{" "}
          {remaining.map((placeholder) => (
            <code
              key={placeholder}
              className="mx-1 rounded-md border border-amber-200 bg-white px-1.5 py-0.5 font-mono text-xs"
            >
              {placeholder}
            </code>
          ))}
          before sending.
        </p>
      ) : null}

      {edited ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">
          You have edited this draft. Changing the offer text or contact fields clears it.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyText("subject")}
          className={copyButtonClass}
        >
          Copy subject
        </button>
        <button
          type="button"
          onClick={() => void copyText("body")}
          className={copyButtonClass}
        >
          Copy message
        </button>
        <button
          type="button"
          onClick={() => void copyText("all")}
          className={copyButtonClass}
        >
          Copy subject and message
        </button>
      </div>

      <p role="status" aria-live="polite" className="mt-2 text-sm font-medium text-emerald-700">
        {successMessage}
      </p>
      <p role="alert" className="mt-1 text-sm font-medium text-rose-700">
        {failureMessage}
      </p>

      <p className="surface-muted mt-3 rounded-xl p-3 text-sm leading-6 text-slate-500">
        Send this using contact details you obtain independently from the employer&apos;s
        official website — not contact details supplied in the message. OfferShield will
        not send the email or choose a recipient. Review and edit it before sending.
      </p>
    </section>
  );
}
