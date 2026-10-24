"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Alert from "@/components/Alert";
import FileUpload from "@/components/FileUpload";
import TextInput from "@/components/TextInput";
import ContactComparisons from "@/components/results/ContactComparisons";
import EvidenceConcerns from "@/components/results/EvidenceConcerns";
import ExtractedClaims from "@/components/results/ExtractedClaims";
import MissingInformation from "@/components/results/MissingInformation";
import PrintReport from "@/components/results/PrintReport";
import ReportControls from "@/components/results/ReportControls";
import ReviewSummary from "@/components/results/ReviewSummary";
import SourceTextPanel, { type SourceView } from "@/components/results/SourceTextPanel";
import VerificationChecklist from "@/components/results/VerificationChecklist";
import VerificationEmail from "@/components/results/VerificationEmail";
import type { AnalysisResult, Finding } from "@/lib/analysis/types";
import { buildVerificationChecklist } from "@/lib/report/checklist";
import {
  buildVerificationEmail,
  type EmailDraft,
} from "@/lib/report/emailDraft";
import {
  buildReportSnapshot,
  type ReportSnapshot,
} from "@/lib/report/reportModel";
import { getErrorMessage, type SubmissionErrorCode } from "@/lib/validation/errors";
import { AnalyzeRequestSchema } from "@/lib/validation/schemas";

interface SubmissionErrorState {
  code: SubmissionErrorCode;
  message: string;
}

type Phase = "input" | "ready";
type MobilePane = "source" | "concerns";

const TEXT_READY_MESSAGE =
  "No analysis yet. Run the review to see evidence, contact comparisons, missing information, and verification actions.";

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400";

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [textError, setTextError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<SubmissionErrorState | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [senderEmail, setSenderEmail] = useState("");
  const [employerWebsite, setEmployerWebsite] = useState("");
  const [aiConsent, setAiConsent] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState("");
  const [sourceView, setSourceView] = useState<SourceView>("edit");
  const [mobilePane, setMobilePane] = useState<MobilePane>("source");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [suggestedDraft, setSuggestedDraft] = useState<EmailDraft | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailEdited, setEmailEdited] = useState(false);
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState<
    "edit" | "analyze" | null
  >(null);
  const [includeSourceText, setIncludeSourceText] = useState(false);
  const [printSnapshot, setPrintSnapshot] = useState<ReportSnapshot | null>(null);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const [invalidatedAfterResult, setInvalidatedAfterResult] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const analysisRequestIdRef = useRef(0);

  function invalidateAnalysis(): void {
    analysisRequestIdRef.current += 1;
    if (result !== null) {
      setInvalidatedAfterResult(true);
    }
    setResult(null);
    setAnalysisError(null);
    setAnalyzing(false);
    setSelectedFindingId(null);
    setSelectionAnnouncement("");
    setCheckedIds([]);
    setSuggestedDraft(null);
    setEmailSubject("");
    setEmailBody("");
    setEmailEdited(false);
    setPendingDestructiveAction(null);
    setIncludeSourceText(false);
    setPrintSnapshot(null);
    setPrintMessage(null);
    setSourceView("edit");
    setMobilePane("source");
  }

  function handleTextChange(value: string): void {
    setText(value);
    if (value !== text) {
      invalidateAnalysis();
    }
  }

  function handleContactChange(
    setter: (value: string) => void,
    value: string,
  ): void {
    setter(value);
    invalidateAnalysis();
  }

  async function handleSubmitText(): Promise<void> {
    if (loading) {
      return;
    }

    const parsedText = AnalyzeRequestSchema.safeParse({ text });
    if (!parsedText.success) {
      setTextError(
        parsedText.error.issues[0]?.message ??
          "Please paste the offer text before submitting.",
      );
      setError(null);
      return;
    }

    setTextError(undefined);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
        setError({
          code: (err?.code ?? "INVALID_TEXT") as SubmissionErrorCode,
          message: err?.message ?? getErrorMessage("INVALID_TEXT"),
        });
        return;
      }

      const extractedText = (data as { text?: string } | null)?.text;
      setText(typeof extractedText === "string" ? extractedText : text);
      setSourceView("edit");
      setPhase("ready");
    } catch {
      setError({ code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitFile(): Promise<void> {
    if (loading) {
      return;
    }

    if (!file) {
      setError({ code: "NO_FILE", message: getErrorMessage("NO_FILE") });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
        setError({
          code: (err?.code ?? "UNSUPPORTED_TYPE") as SubmissionErrorCode,
          message: err?.message ?? getErrorMessage("UNSUPPORTED_TYPE"),
        });
        return;
      }

      const extractedText = (data as { text?: string } | null)?.text;
      if (typeof extractedText !== "string" || extractedText.length === 0) {
        setError({ code: "NO_TEXT", message: getErrorMessage("NO_TEXT") });
        return;
      }

      setText(extractedText);
      setSourceView("edit");
      setPhase("ready");
    } catch {
      setError({ code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Clears everything derived from a review when the review fails, so old
   * findings can never sit next to a failed run.
   */
  function failAnalysis(message: string): void {
    setAnalysisError(message);
    setResult(null);
    setSelectedFindingId(null);
    setSelectionAnnouncement("");
    setCheckedIds([]);
    setSuggestedDraft(null);
    setEmailSubject("");
    setEmailBody("");
    setEmailEdited(false);
    setPendingDestructiveAction(null);
    setIncludeSourceText(false);
    setPrintSnapshot(null);
    setPrintMessage(null);
    setSourceView("edit");
    setMobilePane("concerns");
  }

  async function handleAnalyze(): Promise<void> {
    if (analyzing || loading) {
      return;
    }

    const parsed = AnalyzeRequestSchema.safeParse({
      text,
      senderEmail: senderEmail || undefined,
      employerWebsite: employerWebsite || undefined,
      aiConsent,
    });
    if (!parsed.success) {
      setAnalysisError(
        parsed.error.issues[0]?.message ?? "Please paste the offer text before analyzing.",
      );
      return;
    }

    const requestId = ++analysisRequestIdRef.current;
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: parsed.data.text,
          senderEmail: parsed.data.senderEmail,
          employerWebsite: parsed.data.employerWebsite,
          aiConsent: parsed.data.aiConsent === true,
        }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (requestId !== analysisRequestIdRef.current) {
        return;
      }

      if (!response.ok) {
        const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
        failAnalysis(err?.message ?? "The analysis could not be completed.");
        return;
      }

      const resultData = (data as { result?: AnalysisResult } | null)?.result;
      if (!resultData) {
        failAnalysis("The analysis could not be completed.");
        return;
      }

      const draft = buildVerificationEmail(resultData);
      setResult(resultData);
      setSelectedFindingId(null);
      setSelectionAnnouncement("");
      setCheckedIds([]);
      setSuggestedDraft(draft);
      setEmailSubject(draft.subject);
      setEmailBody(draft.body);
      setEmailEdited(false);
      setPendingDestructiveAction(null);
      setIncludeSourceText(false);
      setPrintSnapshot(null);
      setPrintMessage(null);
      setSourceView("evidence");
      setMobilePane("concerns");
      setInvalidatedAfterResult(false);
    } catch {
      if (requestId !== analysisRequestIdRef.current) {
        return;
      }
      failAnalysis("Network error: the analysis could not be completed.");
    } finally {
      if (requestId === analysisRequestIdRef.current) {
        setAnalyzing(false);
      }
    }
  }

  function handleReset(): void {
    analysisRequestIdRef.current += 1;
    setPhase("input");
    setText("");
    setTextError(undefined);
    setError(null);
    setFile(null);
    setSenderEmail("");
    setEmployerWebsite("");
    setAiConsent(false);
    setResult(null);
    setAnalysisError(null);
    setAnalyzing(false);
    setSelectedFindingId(null);
    setSelectionAnnouncement("");
    setCheckedIds([]);
    setSuggestedDraft(null);
    setEmailSubject("");
    setEmailBody("");
    setEmailEdited(false);
    setPendingDestructiveAction(null);
    setIncludeSourceText(false);
    setPrintSnapshot(null);
    setPrintMessage(null);
    setSourceView("edit");
    setMobilePane("source");
    setInvalidatedAfterResult(false);
  }

  function selectFinding(finding: Finding): void {
    setSelectedFindingId(finding.id);
    setSourceView("evidence");
    setMobilePane("source");
    setSelectionAnnouncement(
      `Showing the exact quotation for "${finding.title}" in the reviewed text.`,
    );
  }

  function selectFindingById(findingId: string): void {
    const finding = result?.findings.find((item) => item.id === findingId);
    if (finding) {
      selectFinding(finding);
    }
  }

  function requestSourceView(view: SourceView): void {
    if (view === "edit" && emailEdited) {
      setPendingDestructiveAction("edit");
      return;
    }
    setSourceView(view);
  }

  function requestAnalyze(): void {
    if (emailEdited) {
      setPendingDestructiveAction("analyze");
      return;
    }
    void handleAnalyze();
  }

  function confirmDestructiveAction(): void {
    const action = pendingDestructiveAction;
    setPendingDestructiveAction(null);
    if (action === "edit") {
      setSourceView("edit");
    }
    if (action === "analyze") {
      void handleAnalyze();
    }
  }

  function toggleChecklistItem(itemId: string, checked: boolean): void {
    setCheckedIds((current) => {
      if (checked) {
        return current.includes(itemId) ? current : [...current, itemId];
      }
      return current.filter((id) => id !== itemId);
    });
  }

  function resetDraft(): void {
    if (!suggestedDraft) {
      return;
    }
    setEmailSubject(suggestedDraft.subject);
    setEmailBody(suggestedDraft.body);
    setEmailEdited(false);
  }

  function handlePrint(): void {
    if (!result) {
      setPrintMessage("Print is unavailable until an analysis has completed.");
      return;
    }
    if (typeof window === "undefined" || typeof window.print !== "function") {
      setPrintMessage(
        "Printing is unavailable in this browser. Use your browser's Print command instead.",
      );
      return;
    }

    const snapshot = buildReportSnapshot({
      result,
      analyzedText: text,
      senderEmail,
      employerWebsite,
      includeSourceText,
    });

    flushSync(() => {
      setPrintSnapshot(snapshot);
      setPrintMessage(null);
    });

    try {
      window.print();
      setPrintMessage(
        "Print dialog opened. Choose a printer or “Save as PDF”; OfferShield does not create the file itself.",
      );
    } catch {
      setPrintMessage(
        "The print dialog could not be opened. Use your browser's Print command instead.",
      );
    }
  }

  const checklistItems = result ? buildVerificationChecklist(result) : [];
  const showSourcePane = mobilePane === "source";
  const showConcernsPane = mobilePane === "concerns";

  const header = (
    <header className="no-print">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600">
        OfferShield
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Review an offer before you reply
      </h1>
      <p className="mt-3 max-w-3xl text-base text-gray-700">
        Review internship and job offer messages and text-based offer letters for
        concerning requests, missing information, and contact inconsistencies — with exact
        evidence and practical verification steps.
      </p>
      <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950">
        Prototype — rule-based checks always run; optional AI review requires your opt-in
        and server configuration.
      </p>
    </header>
  );

  if (phase === "input") {
    return (
      <>
        <div className="no-print min-h-screen bg-gray-50">
          <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
            {header}

            <section
              aria-labelledby="paste-heading"
              className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 id="paste-heading" className="text-xl font-semibold text-gray-900">
                Paste your offer text
              </h2>
              <TextInput
                id="offer-text"
                label="Offer text / recruitment message"
                value={text}
                onChange={(value) => {
                  setText(value);
                  if (error) setError(null);
                }}
                error={textError}
                disabled={loading}
              />
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => void handleSubmitText()}
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  Submit text
                </button>
              </div>
              {error ? <Alert message={error.message} /> : null}
            </section>

            <section
              aria-labelledby="upload-heading"
              className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 id="upload-heading" className="text-xl font-semibold text-gray-900">
                Upload a text-based PDF offer
              </h2>
              <div className="mt-3">
                <FileUpload
                  file={file}
                  onFileChange={(nextFile) => {
                    setFile(nextFile);
                    setError(null);
                  }}
                  disabled={loading}
                />
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => void handleSubmitFile()}
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  Upload &amp; extract PDF
                </button>
              </div>
            </section>

            <section
              aria-labelledby="examples-heading"
              className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 id="examples-heading" className="text-xl font-semibold text-gray-900">
                Try a fictional example
              </h2>
              <p className="mt-1 text-sm text-gray-700">
                Each example fills the text box with invented details. Nothing is analyzed
                until you review the text and run the review yourself.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setText(
                      "We are pleased to offer you the internship. To confirm your acceptance, please pay the registration fee. You must transfer the security deposit before joining.",
                    );
                    setError(null);
                  }}
                >
                  Load fictional example: Payment required to confirm role
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setText(
                      "We are pleased to offer you the internship at Acme Labs. Your responsibilities include supporting the design team. No registration fee is required. We reimburse travel expenses related to the interview process. Contact careers@acmelabs.example.",
                    );
                    setError(null);
                  }}
                >
                  Load fictional example: Ordinary offer with no fee required
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setText(
                      "Hi, this is the recruitment team. Our process requires additional contact verification before the offer can be finalized. Please reply here to confirm your details so we can proceed.",
                    );
                    setError(null);
                  }}
                >
                  Load fictional example: Contact details need verification
                </button>
              </div>
            </section>

            <p className="mt-6 rounded-md bg-gray-100 p-4 text-sm text-gray-700">
              Privacy: please do not upload unnecessary sensitive information. Uploaded
              files are not permanently stored by this application. Text you submit is sent
              to our server for processing.
            </p>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="no-print min-h-screen bg-gray-50">
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          {header}

          <section
            aria-labelledby="setup-heading"
            className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="setup-heading" className="text-xl font-semibold text-gray-900">
                  Review setup
                </h2>
                <p className="mt-1 text-sm text-gray-700">
                  Rule-based checks always run. AI review is optional and requires consent.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={requestAnalyze}
                  disabled={analyzing || loading}
                  className={primaryButtonClass}
                >
                  {analyzing ? "Analyzing…" : result ? "Run review again" : "Analyze offer"}
                </button>
                <button type="button" onClick={handleReset} className={secondaryButtonClass}>
                  Clear review
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-600">
              &ldquo;Clear review&rdquo; removes the offer text, results, checklist progress,
              and email draft from this app&apos;s current state. It does not guarantee
              forensic deletion from browser or operating-system memory, and it cannot
              remove anything already sent to an external AI provider.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <label
                  htmlFor="ai-consent"
                  className="flex items-start gap-2 text-sm font-semibold text-gray-900"
                >
                  <input
                    id="ai-consent"
                    type="checkbox"
                    checked={aiConsent}
                    onChange={(event) => {
                      setAiConsent(event.target.checked);
                      invalidateAnalysis();
                    }}
                    disabled={analyzing}
                    className="mt-0.5 h-4 w-4 rounded border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                  />
                  <span>Also run AI review (optional)</span>
                </label>
                <p className="mt-2 text-xs text-gray-700">
                  If enabled, the reviewed text and any sender email or employer website you
                  entered will be sent to the AI provider configured by this site&apos;s
                  operator. Remove unnecessary personal information first. OfferShield
                  cannot control the external provider&apos;s retention, and AI output is not
                  independently verified.
                </p>
                <p className="mt-1 text-xs text-gray-700">
                  If unchecked, only rule-based checks run and no text is sent to an AI
                  provider.
                </p>
              </div>

              <details className="rounded-md border border-gray-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2">
                  Optional: sender email and claimed employer website
                </summary>
                <label htmlFor="sender-email" className="mt-3 block text-sm font-medium text-gray-900">
                  Sender email (optional, user-supplied, not verified)
                </label>
                <input
                  id="sender-email"
                  type="email"
                  value={senderEmail}
                  onChange={(event) =>
                    handleContactChange(setSenderEmail, event.target.value)
                  }
                  placeholder="e.g. careers@example.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900"
                />
                <label
                  htmlFor="employer-website"
                  className="mt-3 block text-sm font-medium text-gray-900"
                >
                  Claimed employer website (optional, user-supplied, not verified)
                </label>
                <input
                  id="employer-website"
                  type="text"
                  value={employerWebsite}
                  onChange={(event) =>
                    handleContactChange(setEmployerWebsite, event.target.value)
                  }
                  placeholder="e.g. https://example.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900"
                />
                <p className="mt-2 text-xs text-gray-600">
                  These values are never fetched or verified by OfferShield.
                </p>
              </details>
            </div>

            <p className="mt-3 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
              Privacy: text you submit is sent to our server for processing. Uploaded files
              are not permanently stored. If you enable AI review, the reviewed text is also
              sent to the configured external provider.
            </p>
          </section>

          {invalidatedAfterResult && !result ? (
            <p role="status" className="mt-4 rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800">
              The input changed after the last review. The previous results, checklist
              progress, email draft, and report were cleared. Run the review again to
              refresh them.
            </p>
          ) : null}

          {analysisError ? <Alert message={analysisError} /> : null}

          <p role="status" aria-live="polite" className="sr-only">
            {selectionAnnouncement}
          </p>

          <div className="mt-4 lg:hidden" role="group" aria-label="Results panes">
            <div className="flex gap-1 rounded-md bg-gray-200 p-1">
              <button
                type="button"
                aria-pressed={mobilePane === "source"}
                onClick={() => setMobilePane("source")}
                className={`min-h-11 flex-1 rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                  mobilePane === "source" ? "bg-white text-gray-900 shadow-sm" : "text-gray-700"
                }`}
              >
                Source text
              </button>
              <button
                type="button"
                aria-pressed={mobilePane === "concerns"}
                onClick={() => setMobilePane("concerns")}
                className={`min-h-11 flex-1 rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                  mobilePane === "concerns" ? "bg-white text-gray-900 shadow-sm" : "text-gray-700"
                }`}
              >
                Findings and details
              </button>
            </div>
          </div>

          {result ? (
            <div className="mt-4">
              <ReviewSummary result={result} />
            </div>
          ) : null}

          <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className={`min-w-0 ${showSourcePane ? "" : "hidden"} lg:block`}>
              <SourceTextPanel
                text={text}
                findings={result?.findings ?? []}
                selectedFindingId={selectedFindingId}
                view={sourceView}
                hasResult={result !== null}
                disabled={analyzing}
                textareaRef={textareaRef}
                onViewChange={requestSourceView}
                onTextChange={handleTextChange}
              />
            </div>

            <div className={`min-w-0 ${showConcernsPane ? "" : "hidden"} lg:block`}>
              {result ? (
                <div className="space-y-4">
                  <EvidenceConcerns
                    findings={result.findings}
                    selectedFindingId={selectedFindingId}
                    onSelect={selectFinding}
                  />
                  <ContactComparisons
                    comparisons={result.contactComparisons}
                    senderEmail={senderEmail}
                    employerWebsite={employerWebsite}
                  />
                  <MissingInformation items={result.missingInfo} />
                  {result.extracted ? (
                    <ExtractedClaims extracted={result.extracted} />
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  {analyzing ? (
                    <p role="status" className="text-sm font-medium text-gray-800">
                      Analyzing offer… This can take a moment when AI review is enabled.
                    </p>
                  ) : analysisError ? (
                    <>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Unable to complete analysis
                      </h2>
                      <p className="mt-1 text-sm text-gray-700">
                        No results were produced. Your text is still available in the
                        editor, and you can try again.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-gray-900">No analysis yet</h2>
                      <p className="mt-1 text-sm text-gray-700">{TEXT_READY_MESSAGE}</p>
                      <p className="mt-2 text-sm text-gray-700">
                        Review or edit the text, choose whether to allow optional AI review,
                        then select &ldquo;Analyze offer&rdquo;.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {result ? (
            <div className="mt-6 space-y-6">
              <VerificationChecklist
                items={checklistItems}
                checkedIds={checkedIds}
                onToggle={toggleChecklistItem}
                onSelectFinding={selectFindingById}
              />
              <VerificationEmail
                subject={emailSubject}
                body={emailBody}
                edited={emailEdited}
                onSubjectChange={(value) => {
                  setEmailSubject(value);
                  setEmailEdited(true);
                }}
                onBodyChange={(value) => {
                  setEmailBody(value);
                  setEmailEdited(true);
                }}
                onResetDraft={resetDraft}
              />
              <ReportControls
                includeSourceText={includeSourceText}
                onToggleIncludeSourceText={setIncludeSourceText}
                onPrint={handlePrint}
                disabled={result === null}
                message={printMessage}
              />
            </div>
          ) : null}
        </main>
      </div>

      {printSnapshot ? <PrintReport snapshot={printSnapshot} /> : null}

      {pendingDestructiveAction ? (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="destructive-action-title"
            aria-describedby="destructive-action-body"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setPendingDestructiveAction(null);
              }
            }}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2
              id="destructive-action-title"
              className="text-lg font-semibold text-gray-900"
            >
              {pendingDestructiveAction === "edit"
                ? "Edit the offer text?"
                : "Run the review again?"}
            </h2>
            <p id="destructive-action-body" className="mt-2 text-sm text-gray-700">
              {pendingDestructiveAction === "edit"
                ? "You have edited the verification email draft. Changing the offer text clears the current review and that draft. Switching to the editor does not change anything until you type."
                : "You have edited the verification email draft. Running the review again replaces the current results and clears your edited draft."}
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setPendingDestructiveAction(null)}
                className={secondaryButtonClass}
              >
                Keep draft
              </button>
              <button
                type="button"
                onClick={confirmDestructiveAction}
                className={primaryButtonClass}
              >
                {pendingDestructiveAction === "edit"
                  ? "Edit text anyway"
                  : "Run review anyway"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
