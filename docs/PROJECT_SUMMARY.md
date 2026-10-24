# OfferShield — Project Summary

## Title and one-line pitch

**OfferShield** — Review a job or internship offer before you reply, with exact
evidence and honest limits.

## Problem statement

Job and internship scams often arrive as ordinary-looking messages: a recruiter
asks for a registration fee, a "security deposit", or an OTP before the role is
confirmed. Genuine employers can also be vague about fees, timelines, and
contact details. Applicants — especially students making their first career
decisions — are asked to act quickly and have no easy way to separate normal
process friction from a request worth questioning.

Existing advice is generic ("be careful"), and general-purpose chatbots can
produce confident verdicts without showing evidence. OfferShield focuses on a
narrow, auditable task: point at the exact words that need verification and
suggest concrete next steps, without certifying the employer.

## Target users

- Students and recent graduates evaluating internships or first jobs.
- Career-services staff who want a transparent second opinion to discuss with a
  student.
- Anyone who received an unsolicited recruitment message and wants a structured
  checklist before replying.

The prototype is single-user and has no accounts, history, or institutional
admin features.

## Theme 1 justification

Theme 1 is about applying AI to a concrete, everyday problem where trust and
clear limits matter. OfferShield is designed around that framing:

- **Real decision, real consequence:** whether to pay, share credentials, or
  reply to an offer.
- **AI as an optional assistant, not an authority:** deterministic checks always
  run; AI needs explicit consent and server configuration.
- **Transparency over confidence:** exact quotations, code-computed offsets,
  visible limitations, and no fraud probability.
- **Responsible defaults:** no permanent storage, no URL fetching, no automatic
  email, and no claim of authenticity.

## Implemented features

### Input and validation

- Pasted offer text up to 20,000 characters.
- Text-based PDF upload up to 5 MB and 10 pages, with content-based validation.
- Safe rejection of corrupt, encrypted, unsupported, image-only, oversized, and
  too-many-page PDFs.
- Server-side schema validation for text, email, website, and consent fields.
- Three clearly labeled fictional examples that use the real analysis flow.

### Deterministic review

- Explicit payment requests tied to obtaining or confirming a role.
- Requests for OTPs, passwords, or PINs.
- Explicit short-deadline or pressure language.
- Sender-domain versus claimed-employer-website comparison when both values are
  supplied.
- Missing or unidentified fields in the supplied excerpt.
- Code-controlled overall labels and a permanent "not proof of authenticity"
  disclaimer.

### Optional AI review

- Server-side, administrator-configured OpenAI-compatible provider.
- Explicit user opt-in; no consent means no provider request.
- Strict JSON output schema; unknown fields invalidate the response.
- Exact-quotation evidence validation with code-computed offsets.
- Application-side rejection of verdicts and fraud-probability phrasing.
- Rule findings are never suppressed; the model cannot set the overall label.
- Honest fallback labels for unavailable, partial, and completed AI review.

### Results experience

- Split-view evidence with exact character highlighting and repeated-quotation
  handling.
- Contact comparisons that label user-supplied values as unverified.
- Missing-information cards that never fabricate quotations.
- Verification checklist derived from findings; progress does not change labels.
- Editable verification-email draft with placeholders and clipboard feedback.
- Browser print/Save-as-PDF report with source text excluded by default.
- Input edits invalidate results, checklist, draft, and report; stale responses
  cannot overwrite newer runs.

### Privacy, security, and reliability

- No database, no permanent document storage, no browser storage of offer text.
- No logging of offer text, prompts, responses, contact fields, or credentials.
- `Cache-Control: no-store` on API responses and security headers on all routes.
- Request-body ceilings, per-client rate limits, safe 429/413 responses, and a
  per-process concurrency cap.
- Forwarded IP headers are ignored unless `TRUST_PROXY=true` is explicitly set.
- No URL fetching and no model tools.
- AI failures preserve deterministic results.
- `pdf-parse`/`pdfjs-dist` are externalized so PDF parsing works in production
  builds (verified after a production smoke test caught a worker-resolution bug).

## Actual AI integration

- The app calls `POST {LLM_BASE_URL}/chat/completions` with
  `Authorization: Bearer <LLM_API_KEY>` and `model: <LLM_MODEL>`.
- One attempt per analysis, with an abort timeout (default 15 s, clamped to
  2–60 s). No retries, tools, browsing, or function calling.
- The model receives a system prompt plus the reviewed text wrapped in escaped
  `<offer_text>` delimiters and the optional user-supplied contact fields.
- Responses are parsed as strict JSON and validated with Zod. Candidate findings
  are accepted only when their quotation appears exactly in the original text;
  offsets are computed by the application.
- The integration is implemented and covered by mocked tests. **It has not been
  verified against a live provider in this environment**, because no credentials
  were configured and no live test was approved.

## Proposed differentiation

These are design choices, not claims of unique invention:

- **Evidence-first output:** every finding points to an exact character range in
  the user's text instead of producing a free-form verdict.
- **Two-layer review:** deterministic checks are always present and cannot be
  overridden by the model.
- **Honest uncertainty:** no scam probability, no "verified employer", and
  explicit unavailable/partial AI states.
- **Privacy-conscious flow:** rule-only mode works offline from any provider,
  and AI is opt-in per request.
- **Actionable next steps:** a checklist and editable email draft help the user
  verify through official channels.

## Responsible-design choices

- Consent is required before any external AI processing.
- The raw PDF is never sent to the provider; only reviewed text and optional
  contact fields.
- The UI distinguishes application behaviour from provider retention.
- "Clear review" is explicit about what it does and does not erase.
- The model has no browsing, email, or execution tools.
- Unsupported verdicts and unknown schema fields are rejected in code.
- Errors are generic and never include credentials, stack traces, or offer text.
- Mocked tests are described as application-behaviour tests, not proof of live
  prompt-injection resistance.

## Limitations and future work

- Expand rule coverage and multilingual support; current checks are conservative
  English patterns.
- Add OCR for scanned PDFs, with explicit privacy and cost trade-offs.
- Replace the in-process rate limiter with a shared store before public
  deployment.
- Add authentication and abuse controls appropriate to the hosting model.
- Add a full Content-Security-Policy and review CSRF protections.
- Verify live AI behaviour, latency, cost, and prompt-injection resistance with
  an approved provider and fictional data.
- Consider domain/employer verification through official, consented sources —
  never by silently fetching URLs from an offer.
- Add user research and accessibility testing with target users. No user counts,
  adoption, partnerships, or impact metrics are claimed.
