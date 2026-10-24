import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { analyzeOffer } from "@/lib/analysis/analyzer";
import type { AnalysisResult } from "@/lib/analysis/types";

const paymentText = "To confirm your acceptance, please pay the registration fee.";

const ordinaryText =
  "We are pleased to offer you the internship at Acme Labs. Your responsibilities include supporting the design team. No registration fee is required. Contact careers@acmelabs.example.";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

function lastRequestBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const call = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return JSON.parse(call[1].body as string) as Record<string, unknown>;
}

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn(writeText) },
  });
}

function aiResultWithClaims(baseText = paymentText): AnalysisResult {
  return {
    ...analyzeOffer(baseText),
    mode: "rule-and-ai",
    modeLabel: "Rule-based + AI review completed.",
    extracted: {
      claimedCompanyName: "Acme Labs",
      roleTitle: "Design Intern",
      responsibilities: ["Support the design team"],
      contactInformation: ["careers@acmelabs.example"],
      paymentRequest: { statedPurpose: "registration fee" },
      deadlineOrPressure: null,
      sensitiveCredentialRequests: null,
      additionalConcerns: null,
    },
  };
}

describe("OfferShield review page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(navigator, "clipboard");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function reachReadyState(
    fetchMock: ReturnType<typeof vi.fn>,
    text = paymentText,
  ): Promise<void> {
    fetchMock.mockResolvedValueOnce(jsonResponse({ text }));
    render(<Home />);
    fireEvent.change(screen.getByLabelText("Offer text / recruitment message"), {
      target: { value: text },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit text" }));
    await screen.findByRole("button", { name: "Analyze offer" });
  }

  async function runAnalysis(
    fetchMock: ReturnType<typeof vi.fn>,
    result: AnalysisResult,
    text = paymentText,
  ): Promise<void> {
    fetchMock.mockResolvedValueOnce(jsonResponse({ text, result }));
    fireEvent.click(
      screen.getByRole("button", { name: /^(Analyze offer|Run review again)$/ }),
    );
    await screen.findByText(result.modeLabel);
  }

  it("runs a rule-based review without AI consent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);

    const ruleResult = analyzeOffer(paymentText);
    await runAnalysis(fetchMock, ruleResult);

    expect(screen.getByText("Concerning signals found")).toBeTruthy();
    expect(screen.getByText("Rule-based review only.")).toBeTruthy();
    expect(
      screen.getAllByText(
        "This review does not establish whether the offer or employer is genuine.",
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/1 finding requires your review/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "What was checked" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Analysis limitations" })).toBeTruthy();
    expect(lastRequestBody(fetchMock).aiConsent).toBe(false);
  });

  it("sends aiConsent true only after the opt-in checkbox is checked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);

    fireEvent.click(screen.getByLabelText("Also run AI review (optional)"));
    await runAnalysis(fetchMock, aiResultWithClaims());

    expect(lastRequestBody(fetchMock).aiConsent).toBe(true);
    expect(screen.getByText("Rule-based + AI review completed.")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Extracted claims from the offer (not independently verified)",
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("Acme Labs").length).toBeGreaterThan(0);
  });

  it("shows the partial AI review mode", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);

    await runAnalysis(fetchMock, {
      ...analyzeOffer(paymentText),
      mode: "ai-partial",
      modeLabel: "Partial AI review; some output could not be validated.",
    });

    expect(
      screen.getByText("Partial AI review; some output could not be validated."),
    ).toBeTruthy();
    expect(screen.getByText(/Some AI output could not be validated/)).toBeTruthy();
  });

  it("shows the AI-unavailable mode while keeping rule results", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);

    const unavailable: AnalysisResult = {
      ...analyzeOffer(paymentText),
      mode: "ai-unavailable",
      modeLabel: "Rule-based review completed; AI review unavailable.",
      limitations: [
        ...analyzeOffer(paymentText).limitations,
        "AI review is unavailable because the server is not configured with an AI provider. Only the rule-based results are shown.",
      ],
    };
    await runAnalysis(fetchMock, unavailable);

    expect(screen.getByText("Rule-based review completed; AI review unavailable.")).toBeTruthy();
    expect(screen.getByText(/Only the rule-based results are shown/)).toBeTruthy();
    expect(screen.getByText("Concerning signals found")).toBeTruthy();
  });

  it("groups findings by category and shows the source label", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    expect(screen.getByRole("heading", { name: /Payment requests \(1\)/ })).toBeTruthy();
    const quote = "pay the registration fee";
    const card = document.querySelector('[data-finding-id="PAYMENT-001"]') as HTMLElement;
    expect(within(card).getByText(quote)).toBeTruthy();
    expect(within(card).getByText(/Source: Rule-based check/)).toBeTruthy();
    expect(within(card).getByText(/Review priority: High/)).toBeTruthy();
  });

  it("highlights the exact evidence range when a finding is selected", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    fireEvent.click(
      screen.getByRole("button", {
        name: /Show evidence for "Explicit payment request tied to role confirmation"/,
      }),
    );

    const selected = document.querySelector('[data-selected-evidence="true"]');
    expect(selected).not.toBeNull();
    expect(selected?.textContent).toBe("pay the registration fee");
    expect(selected?.getAttribute("data-evidence-start")).toBe(
      String(paymentText.indexOf("pay the registration fee")),
    );

    const card = document.querySelector('[data-finding-id="PAYMENT-001"]');
    expect(card?.getAttribute("data-selected")).toBe("true");
    expect(card?.textContent).toContain("Selected");

    const button = screen.getByRole("button", {
      name: /Show evidence for "Explicit payment request tied to role confirmation"/,
    });
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("supports keyboard selection of evidence", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    const button = screen.getByRole("button", {
      name: /Show evidence for "Explicit payment request tied to role confirmation"/,
    });
    button.focus();
    await user.keyboard("{Enter}");

    expect(document.querySelector('[data-selected-evidence="true"]')).not.toBeNull();
  });

  it("highlights the correct occurrence of a repeated quotation", async () => {
    const repeatedText = "pay the fee. pay the fee.";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock, repeatedText);

    const result = analyzeOffer(repeatedText);
    expect(result.findings).toHaveLength(2);
    await runAnalysis(fetchMock, result, repeatedText);

    const buttons = screen.getAllByRole("button", { name: /Show evidence for/ });
    fireEvent.click(buttons[1]);

    const selected = document.querySelector('[data-selected-evidence="true"]');
    expect(selected?.textContent).toBe("pay the fee");
    expect(selected?.getAttribute("data-evidence-start")).toBe(
      String(repeatedText.indexOf("pay the fee", 1)),
    );
  });

  it("shows missing information without a fabricated quotation", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock, paymentText);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    const heading = screen.getByRole("heading", {
      name: "Missing or unidentified information",
    });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getAllByText(/Not identified in the supplied text/).length).toBeGreaterThan(0);
    expect((section as HTMLElement).querySelector("mark")).toBeNull();
    expect(within(section as HTMLElement).getByText(/Company name/)).toBeTruthy();
  });

  it("shows contact comparisons with a user-supplied caveat and no fabricated evidence", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock, ordinaryText);

    fireEvent.change(screen.getByLabelText(/Sender email/), {
      target: { value: "recruiter@agency.example" },
    });
    fireEvent.change(screen.getByLabelText(/Claimed employer website/), {
      target: { value: "https://acmelabs.example" },
    });

    await runAnalysis(
      fetchMock,
      analyzeOffer(ordinaryText, {
        senderEmail: "recruiter@agency.example",
        employerWebsite: "https://acmelabs.example",
      }),
      ordinaryText,
    );

    const heading = screen.getByRole("heading", {
      name: "Contact-detail comparisons",
    });
    const section = heading.closest("section") as HTMLElement;
    expect(within(section).getByText("agency.example")).toBeTruthy();
    expect(within(section).getByText("acmelabs.example")).toBeTruthy();
    expect(within(section).getAllByText(/user-supplied, unverified/).length).toBeGreaterThan(0);
    expect(within(section).getByText(/did not check domain ownership/)).toBeTruthy();
    expect(section.querySelector("mark")).toBeNull();
  });

  it("builds checklist items from findings and keeps the overall label unchanged when checked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    const result = analyzeOffer(paymentText);
    await runAnalysis(fetchMock, result);

    expect(screen.getByRole("heading", { name: "Verification checklist" })).toBeTruthy();
    expect(screen.getByText(/0 of \d+ marked complete by you/)).toBeTruthy();

    const findingAction = result.findings[0].nextStep;
    const checkbox = screen.getByRole("checkbox", { name: findingAction });
    fireEvent.click(checkbox);

    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/1 of \d+ marked complete by you/)).toBeTruthy();
    expect(screen.getByText("Concerning signals found")).toBeTruthy();
    expect(
      screen.getAllByText(
        "This review does not establish whether the offer or employer is genuine.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("resets checklist progress when the offer input changes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    const result = analyzeOffer(paymentText);
    await runAnalysis(fetchMock, result);

    const checkbox = screen.getByRole("checkbox", {
      name: result.findings[0].nextStep,
    });
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    fireEvent.change(screen.getByLabelText("Edited offer text"), {
      target: { value: `${paymentText} Updated.` },
    });

    expect(screen.queryByText("Concerning signals found")).toBeNull();

    await runAnalysis(fetchMock, result);
    const resetCheckbox = screen.getByRole("checkbox", {
      name: result.findings[0].nextStep,
    });
    expect((resetCheckbox as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/0 of \d+ marked complete by you/)).toBeTruthy();
  });

  it("generates an editable verification email with placeholders in rule-only mode", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    const subject = screen.getByLabelText("Subject") as HTMLInputElement;
    const body = screen.getByLabelText("Message body") as HTMLTextAreaElement;

    expect(subject.value).toContain("[role]");
    expect(body.value).toContain("Hello [recruitment team],");
    expect(body.value).toContain("Please clarify:");
    expect(body.value).toContain(
      "Could you confirm whether any payment, deposit, or fee is required",
    );
    expect(screen.getAllByText(/Replace the placeholder/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Send this using contact details you obtain independently/)).toBeTruthy();
  });

  it("uses validated extracted claims in the email draft", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, aiResultWithClaims());

    const subject = screen.getByLabelText("Subject") as HTMLInputElement;
    const body = screen.getByLabelText("Message body") as HTMLTextAreaElement;

    expect(subject.value).toBe(
      "Request to verify recruitment details for Design Intern",
    );
    expect(body.value).toContain("Hello Acme Labs recruitment team,");
    expect(screen.queryByText(/\[role\]/)).toBeNull();
  });

  it("lets the user edit and copy the email, and reports copy success", async () => {
    stubClipboard(async () => undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    const subject = screen.getByLabelText("Subject") as HTMLInputElement;
    const body = screen.getByLabelText("Message body") as HTMLTextAreaElement;
    fireEvent.change(subject, { target: { value: "My subject" } });
    fireEvent.change(body, { target: { value: "My edited message" } });
    expect(screen.getByText(/You have edited this draft/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Copy subject" }));
    await screen.findByText(/Copied the subject to the clipboard/);

    fireEvent.click(screen.getByRole("button", { name: "Copy subject and message" }));
    await screen.findByText(/Copied the subject and message to the clipboard/);

    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    expect(writeText).toHaveBeenCalledWith("My subject");
    expect(writeText).toHaveBeenLastCalledWith(
      "Subject: My subject\n\nMy edited message",
    );
  });

  it("reports clipboard failure without losing the draft", async () => {
    stubClipboard(async () => {
      throw new Error("denied");
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));

    await screen.findByText(/Could not copy the message/);
    expect(
      (screen.getByLabelText("Message body") as HTMLTextAreaElement).value,
    ).toContain("Please clarify:");
  });

  it("reports unavailable clipboard access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    // jsdom has no clipboard implementation unless a test stubs one.
    fireEvent.click(screen.getByRole("button", { name: "Copy subject" }));

    await screen.findByText(/Could not copy the subject/);
  });

  it("restores the suggested draft", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    const subject = screen.getByLabelText("Subject") as HTMLInputElement;
    const original = subject.value;
    fireEvent.change(subject, { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset to suggested draft" }));

    expect((screen.getByLabelText("Subject") as HTMLInputElement).value).toBe(original);
    expect(screen.queryByText(/You have edited this draft/)).toBeNull();
  });

  it("warns before switching to editing when the draft was edited", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    fireEvent.change(screen.getByLabelText("Message body"), {
      target: { value: "Edited draft" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit text" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain("clears the current review and that draft");

    fireEvent.click(screen.getByRole("button", { name: "Keep draft" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Edit text" }).getAttribute("aria-pressed"),
    ).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Edit text" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit text anyway" }));
    expect(
      screen.getByRole("button", { name: "Edit text" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("warns before re-running the review when the draft was edited", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    const result = analyzeOffer(paymentText);
    await runAnalysis(fetchMock, result);

    fireEvent.change(screen.getByLabelText("Message body"), {
      target: { value: "Edited draft" },
    });

    const callsBefore = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Run review again" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("Running the review again replaces");
    expect(fetchMock.mock.calls.length).toBe(callsBefore);

    fetchMock.mockResolvedValueOnce(jsonResponse({ text: paymentText, result }));
    fireEvent.click(screen.getByRole("button", { name: "Run review anyway" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(screen.queryByText(/You have edited this draft/)).toBeNull();
    });
    expect(
      (screen.getByLabelText("Message body") as HTMLTextAreaElement).value,
    ).toContain("[your name]");
    expect(screen.queryByText("Edited draft")).toBeNull();
  });

  it("prints a report that excludes the complete source text by default", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    fireEvent.click(screen.getByRole("button", { name: "Print / Save as PDF" }));

    const report = screen.getByTestId("print-report");
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(within(report).getByText("OfferShield")).toBeTruthy();
    expect(within(report).getByText(/Report generated:/)).toBeTruthy();
    expect(within(report).getByText("Concerning signals found")).toBeTruthy();
    expect(within(report).getByText(/Rule-based review only\./)).toBeTruthy();
    expect(within(report).getByText(/The complete reviewed text was not included/)).toBeTruthy();
    expect(within(report).queryByText(paymentText)).toBeNull();
    expect(within(report).getAllByText(/pay the registration fee/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Print dialog opened/)).toBeTruthy();
  });

  it("includes the complete source text only when explicitly requested", async () => {
    vi.spyOn(window, "print").mockImplementation(() => undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    fireEvent.click(
      screen.getByLabelText("Include the complete reviewed text in the report"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Print / Save as PDF" }));

    const report = screen.getByTestId("print-report");
    expect(within(report).getByText(paymentText)).toBeTruthy();
    expect(within(report).getByText(/Included because you selected the option/)).toBeTruthy();
  });

  it("reports when browser printing is unavailable", async () => {
    vi.stubGlobal("print", undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    fireEvent.click(screen.getByRole("button", { name: "Print / Save as PDF" }));

    expect(screen.getByText(/Printing is unavailable in this browser/)).toBeTruthy();
    expect(screen.queryByTestId("print-report")).toBeNull();
  });

  it("clears results, checklist, draft, and report when the input changes", async () => {
    vi.spyOn(window, "print").mockImplementation(() => undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    fireEvent.click(screen.getByRole("button", { name: "Print / Save as PDF" }));
    expect(screen.getByTestId("print-report")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Edited offer text"), {
      target: { value: `${paymentText} Changed.` },
    });

    expect(screen.queryByTestId("print-report")).toBeNull();
    expect(screen.queryByText("Review summary")).toBeNull();
    expect(screen.queryByLabelText("Message body")).toBeNull();
    expect(screen.getByText(/The input changed after the last review/)).toBeTruthy();
  });

  it("shows the no-warning state without inventing findings", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock, ordinaryText);
    await runAnalysis(fetchMock, analyzeOffer(ordinaryText), ordinaryText);

    expect(screen.getByText("No configured warning signals found")).toBeTruthy();
    expect(
      screen.getAllByText("No evidence-backed findings were flagged.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/That does not mean the offer is genuine/)).toBeTruthy();
  });

  it("shows a complete analysis failure without results or print controls", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    fireEvent.click(screen.getByRole("button", { name: "Analyze offer" }));

    await screen.findByText("Unable to complete analysis");
    expect(screen.getByRole("alert").textContent).toContain("Network error");
    expect(screen.queryByRole("button", { name: "Print / Save as PDF" })).toBeNull();
    expect(screen.queryByText("Review summary")).toBeNull();
  });

  it("clears previous results when a re-run fails", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    fireEvent.click(screen.getByRole("button", { name: "Run review again" }));

    await screen.findByText("Unable to complete analysis");
    expect(screen.queryByText("Concerning signals found")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print / Save as PDF" })).toBeNull();
    expect(screen.queryByLabelText("Message body")).toBeNull();
    expect(screen.queryByTestId("print-report")).toBeNull();
  });

  it("prevents duplicate analysis submissions", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);

    fetchMock.mockReturnValueOnce(new Promise<Response>(() => undefined));
    const analyzeButton = screen.getByRole("button", { name: "Analyze offer" });
    fireEvent.click(analyzeButton);
    fireEvent.click(analyzeButton);

    // Submit-text request + exactly one analysis request.
    expect(fetchMock.mock.calls.length).toBe(2);
  });

  it("ignores a stale response that resolves after the text was edited", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);

    let resolveAnalysis!: (value: Response) => void;
    const pendingAnalysis = new Promise<Response>((resolve) => {
      resolveAnalysis = resolve;
    });
    fetchMock.mockReturnValueOnce(pendingAnalysis);

    fireEvent.click(screen.getByRole("button", { name: "Analyze offer" }));
    expect(screen.getAllByText(/Analyzing offer/).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Edited offer text"), {
      target: { value: `${paymentText} Updated.` },
    });

    const staleResult: AnalysisResult = {
      ...analyzeOffer(paymentText),
      label: "Additional verification needed",
    };

    await act(async () => {
      resolveAnalysis(jsonResponse({ text: paymentText, result: staleResult }));
    });

    expect(screen.queryByText("Additional verification needed")).toBeNull();
    expect(screen.queryByText(/Analyzing offer/)).toBeNull();
  });

  it("switches mobile panes with clearly labelled controls", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    const findingsButton = screen.getByRole("button", { name: "Findings and details" });
    const sourceButton = screen.getByRole("button", { name: "Source text" });
    expect(findingsButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(sourceButton);
    expect(sourceButton.getAttribute("aria-pressed")).toBe("true");
    expect(findingsButton.getAttribute("aria-pressed")).toBe("false");

    // Selecting evidence moves the mobile view back to the source pane.
    fireEvent.click(findingsButton);
    fireEvent.click(
      screen.getByRole("button", { name: /Show evidence for/ }),
    );
    expect(sourceButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("marks the Evidence view as selected after analysis", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    expect(
      screen.getByRole("button", { name: "Evidence view" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Edit text" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("renders HTML-like offer text as inert text, not markup", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const htmlText =
      'Please pay the registration fee. <img src=x onerror="alert(1)"><script>alert(1)</script>';
    await reachReadyState(fetchMock, htmlText);
    await runAnalysis(fetchMock, analyzeOffer(htmlText), htmlText);

    const region = screen.getByRole("region", {
      name: "Reviewed offer text with evidence highlighting",
    });
    expect(region.querySelector("script")).toBeNull();
    expect(region.querySelector("img")).toBeNull();
    expect(region.textContent).toContain("<script>alert(1)</script>");
  });

  it("clears the current review from app state with a non-forensic note", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reachReadyState(fetchMock);
    await runAnalysis(fetchMock, analyzeOffer(paymentText));

    expect(screen.getByText(/does not guarantee forensic deletion/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear review" }));

    expect(screen.getByRole("button", { name: "Submit text" })).toBeTruthy();
    expect(screen.queryByText("Review summary")).toBeNull();
    expect(
      (screen.getByLabelText("Offer text / recruitment message") as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
