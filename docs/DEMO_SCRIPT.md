# OfferShield — 3-minute demo script

**Before you start**

- Run `npm install` and `npm run dev`, then open `http://localhost:3000`.
- Use fictional text only. The examples in the app are invented.
- Decide which mode you are demoing:
  - **Rule-only (default, always available):** leave AI consent unchecked and do
    not claim any AI ran.
  - **Live AI:** only if the operator has configured `LLM_BASE_URL`,
    `LLM_API_KEY`, and `LLM_MODEL`, and the run actually returns
    "Rule-based + AI review completed." Never present a prerecorded AI result as
    live.
- Have the browser print dialog ready but do not rely on a physical printer.

---

## 0:00–0:25 — Problem and user

> "Students and early-career applicants get job and internship offers by email,
> chat, and PDF. Some ask for registration fees, deposits, or OTPs. People are
> often told to 'trust the recruiter' and have no quick way to separate a normal
> process from a risky one.
>
> OfferShield is a review assistant. It never declares an offer genuine or a
> scam. It shows what in the message needs a second look, with the exact words
> and practical next steps."

Point at the prototype banner: rule checks always run; AI is optional.

## 0:25–0:50 — Analyze a fictional offer

1. Click **Load fictional example: Payment required to confirm role**.
2. Read the text aloud briefly: registration fee plus a security deposit.
3. Leave **Also run AI review (optional)** unchecked for the rule-only path.
4. Click **Submit text**, then **Analyze offer**.

> "The deterministic checks found an explicit payment request tied to confirming
> the role. The label is 'Concerning signals found' — not 'scam'."

Point out the mode label ("Rule-based review only.") and the disclaimer that the
review does not establish whether the offer or employer is genuine.

## 0:50–1:15 — Exact evidence

1. In **Evidence-backed concerns**, select the payment finding.
2. The source pane highlights the exact quotation:
   `pay the registration fee`.
3. Point out the category, priority, source (`Rule-based check`), explanation,
   and suggested next action.

> "The highlight is not a summary. It is the exact character range from the
> submitted text. Every finding has to point at real words."

## 1:15–1:40 — Change the wording and rerun

1. Click **Edit text**.
2. Replace the payment sentence with:
   `No registration fee is required for this role.`
3. Point out that the previous results, checklist progress, email draft, and
   report disappear immediately.
4. Click **Analyze offer** again.

> "The old result cannot survive an edit. The label changes to 'No configured
> warning signals found' — which still does not mean the offer is genuine."

If time is tight, load the **Ordinary offer with no fee required** example
instead.

## 1:40–2:05 — Verification checklist

1. Scroll to **Verification checklist**.
2. Check one item.

> "These are actions for the applicant: verify the sender through the employer's
> official website, ask about fees in writing, and so on. Checking a box only
> records the user's progress. It never changes the review label."

## 2:05–2:25 — Editable email draft

1. Scroll to **Verification email draft**.
2. Edit one sentence.
3. Click **Copy message** (or **Copy subject and message**).

> "The draft is deterministic, factual, and never accusatory. It uses
> placeholders when details are missing. OfferShield never sends email and never
> chooses a recipient — the user must use contact details obtained independently."

If clipboard permissions block the demo, say so and show the draft text instead;
do not claim the copy succeeded.

## 2:25–2:45 — Print report

1. Optionally tick **Include the complete source text** only if you want to show
   the privacy trade-off.
2. Click **Print / Save as PDF**.
3. Show the print preview or the browser dialog.

> "The report is generated in the browser. Source text is excluded by default
> because quotations and fields can still contain personal data. OfferShield does
> not create or upload the PDF."

## 2:45–3:00 — Honest limitations

> "This is a prototype. The rules are conservative English patterns and miss
> paraphrases, other languages, and scanned PDFs. Domain comparison uses the
> website the user typed; we never fetch it. AI output is optional, requires
> consent, and is checked for schema and exact quotations — but a mocked test is
> not proof that a live model resists prompt injection. The rate limiter is
> local to one process, so public deployment needs a shared limiter. And we do
> not promise deletion from the AI provider."

Click **Clear review** and note the wording: it clears current app state, not
forensic memory.

---

## Rule-only fallback plan (use if live AI is unavailable)

This is the safe default and requires no provider.

1. Say clearly: **"AI review is not configured for this demo; we are showing the
   rule-based path."**
2. Leave the AI consent checkbox unchecked.
3. Run the payment example and the no-fee example exactly as above.
4. Show evidence highlighting, the checklist, the email draft, and the print
   report.
5. Optionally tick AI consent with no configuration to show the honest fallback:
   rule results remain and the mode reads
   "Rule-based review completed; AI review unavailable."
6. Do **not** describe rule-only output as AI output, and do not show a
   prerecorded AI result as if it were live.

## Failure recovery

| Problem | Recovery |
| --- | --- |
| Analysis fails | Say the review could not complete; the text is still in the editor. Retry once, then switch to rule-only or describe the expected result without inventing one. |
| AI is unavailable | Use the rule-only fallback plan above. |
| PDF upload rejected | Use the pasted-text examples; mention scanned/encrypted PDFs are intentionally rejected. |
| Print dialog does not open | Say the environment blocks printing and describe the report sections; do not claim a PDF was produced. |
| Clipboard blocked | Show the draft and say copying needs browser permission. |
