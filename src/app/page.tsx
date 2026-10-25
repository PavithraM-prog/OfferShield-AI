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
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-5 py-2.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0";

const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-5 py-2.5 text-base font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

const exampleButtonClass =
  "group flex min-h-12 w-full items-start gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-left text-base font-medium text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:text-indigo-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2";

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
      <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
            >
              <path
                d="M12 3l7 3v5c0 4.4-2.9 8.4-7 10-4.1-1.6-7-5.6-7-10V6l7-3z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-950">
              OfferShield
            </p>
            <p className="text-sm text-slate-500">Offer review dashboard</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-sm font-semibold text-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Rule-based checks on
        </span>
      </div>

      <div className="hero-surface mt-8 rounded-[2rem] p-6 animate-fade-up animation-delay-100 sm:p-8 lg:p-10">
        <div className="relative z-10 max-w-4xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
            Evidence-first review
          </p>
          <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Review an offer <span className="gradient-text">before you reply</span>
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
            Review internship and job offer messages and text-based offer letters for
            concerning requests, missing information, and contact inconsistencies — with
            exact evidence and practical verification steps.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Exact quotations", "Optional AI review", "Printable report"].map(
              (label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                    aria-hidden="true"
                  />
                  {label}
                </span>
              ),
            )}
          </div>
          <p className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-950">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700"
              aria-hidden="true"
            >
              !
            </span>
            <span>
              Prototype — rule-based checks always run; optional AI review requires your
              opt-in and server configuration.
            </span>
          </p>
        </div>
      </div>
    </header>
  );

  if (phase === "input") {
    return (
      <>
        <div className="no-print relative min-h-screen overflow-x-clip">
          <div className="aurora-bg" aria-hidden="true">
            <div className="aurora-grid" />
          </div>
          <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            {header}

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
              <section
                aria-labelledby="paste-heading"
                className="surface animate-fade-up animation-delay-200 rounded-3xl p-5 sm:p-7"
              >
                <div className="flex items-start gap-4">
                  <div className="icon-badge" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path
                        d="M4 6h16M4 12h10M4 18h13"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                      Start here
                    </p>
                    <h2
                      id="paste-heading"
                      className="mt-1 text-2xl font-bold tracking-tight text-slate-950"
                    >
                      Paste your offer text
                    </h2>
                    <p className="mt-1 text-base leading-7 text-slate-600">
                      Paste the recruitment message or offer letter exactly as you received
                      it. The review looks for evidence in that text.
                    </p>
                  </div>
                </div>
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
                  rows={12}
                />
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => void handleSubmitText()}
                    disabled={loading}
                    className={primaryButtonClass}
                  >
                    {loading ? (
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden="true"
                      />
                    ) : null}
                    Submit text
                  </button>
                  <p className="text-sm leading-6 text-slate-500">
                    Nothing is analyzed until you submit and run the review.
                  </p>
                </div>
                {error ? <Alert message={error.message} /> : null}
              </section>

              <div className="space-y-6">
                <section
                  aria-labelledby="upload-heading"
                  className="surface animate-fade-up animation-delay-300 rounded-3xl p-5 sm:p-7"
                >
                  <div className="flex items-start gap-4">
                    <div className="icon-badge" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path
                          d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                        Or upload
                      </p>
                      <h2
                        id="upload-heading"
                        className="mt-1 text-2xl font-bold tracking-tight text-slate-950"
                      >
                        Upload a text-based PDF offer
                      </h2>
                    </div>
                  </div>
                  <div className="mt-4">
                    <FileUpload
                      file={file}
                      onFileChange={(nextFile) => {
                        setFile(nextFile);
                        setError(null);
                      }}
                      disabled={loading}
                    />
                  </div>
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => void handleSubmitFile()}
                      disabled={loading}
                      className={`${primaryButtonClass} w-full`}
                    >
                      {loading ? (
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                          aria-hidden="true"
                        />
                      ) : null}
                      Upload &amp; extract PDF
                    </button>
                  </div>
                </section>

                <section
                  aria-labelledby="examples-heading"
                  className="surface animate-fade-up animation-delay-400 rounded-3xl p-5 sm:p-7"
                >
                  <div className="flex items-start gap-4">
                    <div className="icon-badge" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path
                          d="M12 3l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2L4.5 8.5l5.2-.8L12 3z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                        Explore safely
                      </p>
                      <h2
                        id="examples-heading"
                        className="mt-1 text-2xl font-bold tracking-tight text-slate-950"
                      >
                        Try a fictional example
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Each example fills the text box with invented details. Nothing is
                        analyzed until you review the text and run the review yourself.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      className={exampleButtonClass}
                      onClick={() => {
                        setText(
                          "We are pleased to offer you the internship. To confirm your acceptance, please pay the registration fee. You must transfer the security deposit before joining.",
                        );
                        setError(null);
                      }}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                        01
                      </span>
                      <span>Load fictional example: Payment required to confirm role</span>
                    </button>
                    <button
                      type="button"
                      className={exampleButtonClass}
                      onClick={() => {
                        setText(
                          "We are pleased to offer you the internship at Acme Labs. Your responsibilities include supporting the design team. No registration fee is required. We reimburse travel expenses related to the interview process. Contact careers@acmelabs.example.",
                        );
                        setError(null);
                      }}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">
                        02
                      </span>
                      <span>Load fictional example: Ordinary offer with no fee required</span>
                    </button>
                    <button
                      type="button"
                      className={exampleButtonClass}
                      onClick={() => {
                        setText(
                          "Hi, this is the recruitment team. Our process requires additional contact verification before the offer can be finalized. Please reply here to confirm your details so we can proceed.",
                        );
                        setError(null);
                      }}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-700">
                        03
                      </span>
                      <span>Load fictional example: Contact details need verification</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>

            <div className="surface-muted mt-6 flex items-start gap-3 rounded-2xl p-4 text-base leading-7 text-slate-600 sm:p-5">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="M7 10V8a5 5 0 0110 0v2m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a2 2 0 012-2z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p>
                <span className="font-semibold text-slate-800">Privacy:</span> please do not
                upload unnecessary sensitive information. Uploaded files are not permanently
                stored by this application. Text you submit is sent to our server for
                processing.
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="no-print relative min-h-screen overflow-x-clip">
        <div className="aurora-bg" aria-hidden="true">
          <div className="aurora-grid" />
        </div>
        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          {header}

          <section
            aria-labelledby="setup-heading"
            className="surface animate-fade-up animation-delay-200 mt-8 rounded-3xl p-5 sm:p-7"
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                  Configure the review
                </p>
                <h2
                  id="setup-heading"
                  className="mt-1 text-2xl font-bold tracking-tight text-slate-950"
                >
                  Review setup
                </h2>
                <p className="mt-1 text-base leading-7 text-slate-600">
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
                  {analyzing ? (
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden="true"
                    />
                  ) : null}
                  {analyzing ? "Analyzing…" : result ? "Run review again" : "Analyze offer"}
                </button>
                <button type="button" onClick={handleReset} className={secondaryButtonClass}>
                  Clear review
                </button>
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              &ldquo;Clear review&rdquo; removes the offer text, results, checklist progress,
              and email draft from this app&apos;s current state. It does not guarantee
              forensic deletion from browser or operating-system memory, and it cannot
              remove anything already sent to an external AI provider.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="surface-muted rounded-2xl p-4 sm:p-5">
                <label
                  htmlFor="ai-consent"
                  className="flex items-start gap-3 text-base font-semibold text-slate-900"
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
                    className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                  />
                  <span>Also run AI review (optional)</span>
                </label>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  If enabled, the reviewed text and any sender email or employer website you
                  entered will be sent to the AI provider configured by this site&apos;s
                  operator. Remove unnecessary personal information first. OfferShield
                  cannot control the external provider&apos;s retention, and AI output is not
                  independently verified.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  If unchecked, only rule-based checks run and no text is sent to an AI
                  provider.
                </p>
              </div>

              <details className="surface-muted group rounded-2xl p-4 sm:p-5">
                <summary className="cursor-pointer list-none text-base font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    <span>Optional: sender email and claimed employer website</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </summary>
                <label
                  htmlFor="sender-email"
                  className="mt-4 block text-base font-medium text-slate-800"
                >
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
                  className="field-control mt-2 block p-3 text-base text-slate-900"
                />
                <label
                  htmlFor="employer-website"
                  className="mt-4 block text-base font-medium text-slate-800"
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
                  className="field-control mt-2 block p-3 text-base text-slate-900"
                />
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  These values are never fetched or verified by OfferShield.
                </p>
              </details>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm leading-6 text-slate-600">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <path
                    d="M7 10V8a5 5 0 0110 0v2m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a2 2 0 012-2z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p>
                <span className="font-semibold text-slate-800">Privacy:</span> text you
                submit is sent to our server for processing. Uploaded files are not
                permanently stored. If you enable AI review, the reviewed text is also sent
                to the configured external provider.
              </p>
            </div>
          </section>

          {invalidatedAfterResult && !result ? (
            <div
              role="status"
              className="animate-soft-pop mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-base leading-7 text-amber-950 shadow-sm"
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700"
                aria-hidden="true"
              >
                !
              </span>
              <p>
                The input changed after the last review. The previous results, checklist
                progress, email draft, and report were cleared. Run the review again to
                refresh them.
              </p>
            </div>
          ) : null}

          {analysisError ? <Alert message={analysisError} /> : null}

          <p role="status" aria-live="polite" className="sr-only">
            {selectionAnnouncement}
          </p>

          <div className="mt-5 lg:hidden" role="group" aria-label="Results panes">
            <div className="surface-muted flex gap-1.5 rounded-2xl p-1.5 shadow-sm">
              <button
                type="button"
                aria-pressed={mobilePane === "source"}
                onClick={() => setMobilePane("source")}
                className={`min-h-12 flex-1 rounded-xl px-3 py-2 text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                  mobilePane === "source"
                    ? "bg-white text-indigo-700 shadow-md shadow-slate-900/5"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                }`}
              >
                Source text
              </button>
              <button
                type="button"
                aria-pressed={mobilePane === "concerns"}
                onClick={() => setMobilePane("concerns")}
                className={`min-h-12 flex-1 rounded-xl px-3 py-2 text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                  mobilePane === "concerns"
                    ? "bg-white text-indigo-700 shadow-md shadow-slate-900/5"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                }`}
              >
                Findings and details
              </button>
            </div>
          </div>

          {result ? (
            <div className="mt-5 animate-fade-up animation-delay-100">
              <ReviewSummary result={result} />
            </div>
          ) : null}

          <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:items-start">
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
                <div className="surface animate-soft-pop rounded-3xl p-6 sm:p-7">
                  {analyzing ? (
                    <div className="flex items-start gap-4">
                      <span
                        className="mt-1 h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600"
                        aria-hidden="true"
                      />
                      <div>
                        <p
                          role="status"
                          className="text-base font-semibold text-slate-900"
                        >
                          Analyzing offer… This can take a moment when AI review is enabled.
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Your review will appear here as soon as it is ready.
                        </p>
                      </div>
                    </div>
                  ) : analysisError ? (
                    <>
                      <h2 className="text-xl font-bold tracking-tight text-slate-950">
                        Unable to complete analysis
                      </h2>
                      <p className="mt-1 text-base leading-7 text-slate-600">
                        No results were produced. Your text is still available in the
                        editor, and you can try again.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="icon-badge" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                            <path
                              d="M12 8v4m0 4h.01M10.3 4.4L3.2 17a2 2 0 001.7 3h14.2a2 2 0 001.7-3L13.7 4.4a2 2 0 00-3.4 0z"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-slate-950">
                            No analysis yet
                          </h2>
                          <p className="mt-1 text-base leading-7 text-slate-600">
                            {TEXT_READY_MESSAGE}
                          </p>
                          <p className="mt-2 text-base leading-7 text-slate-600">
                            Review or edit the text, choose whether to allow optional AI
                            review, then select &ldquo;Analyze offer&rdquo;.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {result ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-2 xl:items-start">
              <VerificationChecklist
                items={checklistItems}
                checkedIds={checkedIds}
                onToggle={toggleChecklistItem}
                onSelectFinding={selectFindingById}
              />
              <div className="space-y-6">
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
            </div>
          ) : null}
        </main>
      </div>

      {printSnapshot ? <PrintReport snapshot={printSnapshot} /> : null}

      {pendingDestructiveAction ? (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
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
            className="animate-soft-pop w-full max-w-lg rounded-3xl border border-white/80 bg-white p-6 shadow-2xl shadow-slate-950/25 sm:p-7"
          >
            <h2
              id="destructive-action-title"
              className="text-2xl font-bold tracking-tight text-slate-950"
            >
              {pendingDestructiveAction === "edit"
                ? "Edit the offer text?"
                : "Run the review again?"}
            </h2>
            <p
              id="destructive-action-body"
              className="mt-2 text-base leading-7 text-slate-600"
            >
              {pendingDestructiveAction === "edit"
                ? "You have edited the verification email draft. Changing the offer text clears the current review and that draft. Switching to the editor does not change anything until you type."
                : "You have edited the verification email draft. Running the review again replaces the current results and clears your edited draft."}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
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
