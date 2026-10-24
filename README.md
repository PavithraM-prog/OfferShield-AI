# OfferShield

**Review a job or internship offer before you reply.** OfferShield highlights
concerning requests, missing information, and contact inconsistencies with exact
quotations and practical verification steps — without declaring an offer genuine
or fraudulent.

This is a hackathon prototype, not a certified fraud-detection or employer-
verification service.

## Theme 1 alignment

Theme 1 is about applying AI to a concrete, everyday problem where trust and
clear limits matter. OfferShield targets a high-stakes decision — whether to act
on a job or internship offer — and treats AI as an optional second reviewer
rather than an authority. Deterministic checks always run, AI requires explicit
consent, the model cannot choose the overall label, and every result states what
was and was not checked.

## What OfferShield does

- **Rule-based review (always runs).** Deterministic checks for:
  - explicit payment requests tied to obtaining or confirming a role,
  - requests to disclose OTPs, passwords, or PINs,
  - explicit short-deadline or pressure language,
  - sender-domain versus claimed-employer-website differences (only when both
    values are supplied by the user),
  - missing or unidentified fields in the supplied excerpt.
- **Optional AI review (opt-in, server-configured).** An OpenAI-compatible chat
  model extracts claimed fields and proposes evidence-backed findings. Every AI
  finding must quote the original text exactly; offsets are computed in code and
  unmatched quotations are rejected.
- **Merged results.** Rule findings are never removed by the AI. Each finding is
  labelled `Rule-based check`, `AI review`, or both. The AI cannot choose the
  overall label or increase a finding's priority.
- **Results experience.** Split-view evidence highlighting, contact
  comparisons, missing-information cards, a verification checklist, an editable
  verification-email draft, and a browser-printed report.

## What OfferShield does not do

- It does not verify that an employer, recruiter, domain, or offer is genuine.
- It does not declare an offer a scam or output a fraud probability/score.
- It does not browse, fetch links, send email, or contact anyone.
- It does not store offers, PDFs, prompts, results, or drafts permanently.
- It does not replace official channels, legal advice, or your own judgement.

## Architecture

```
Browser (React client component)
  │  JSON text or multipart PDF
  ▼
Next.js route handler  src/app/api/analyze/route.ts
  │  body-size cap → rate limit → schema validation → concurrency slot
  ├─ PDF path: pdf-parse text extraction (in memory, bounded)
  └─ JSON path: runOfferAnalysis()
        ├─ deterministic analyzer (always)
        └─ optional OpenAI-compatible provider (only with consent + config)
  ▼
JSON response (rule results, validated AI findings, honest mode label)
  ▼
Browser rendering (React text escaping, no raw HTML)
```

There is no database, no authentication, no file storage, and no background job
queue. Everything is request-scoped and held in memory.

### Folder structure

```
src/
  app/
    api/analyze/route.ts   POST endpoint: limits, consent, analysis
    layout.tsx, page.tsx   single-page client UI
    globals.css
  components/
    TextInput.tsx, FileUpload.tsx, Alert.tsx
    results/               summary, evidence, checklist, email, print report
  lib/
    analysis/              deterministic checks, evidence, merge, labels
    limits/config.ts       all documented size/page/text limits
    llm/                   provider adapter, prompt, strict output schema
    pdf/extractor.ts       bounded, content-validated PDF extraction
    report/                checklist, email draft, print model, highlighting
    security/rateLimit.ts  in-process limiter, identity, concurrency
    validation/            request schemas and safe error messages
tests/                     Vitest unit + component + route tests
docs/                      demo script, project summary, final verification
```

## Supported input and limits

| Input | Limit |
| --- | --- |
| Pasted offer text | 20,000 characters (documented `MAX_TEXT_LENGTH`) |
| PDF file size | 5 MB |
| PDF pages | 10 |
| PDF extracted text | 20,000 characters |
| PDF parse wait | 20 seconds (best effort; see limitation below) |
| JSON request body | 128 KB |
| Multipart request body | 5 MB + 256 KB form overhead |
| AI provider timeout | 2–60 seconds, default 15 seconds |
| Analysis requests | 30 per client per minute |
| AI-consented requests | 10 per client per minute |
| Concurrent analyses | 4 per server process |

PDF checks are content-based: the file must contain a `%PDF-` header near the
start. Corrupt, encrypted/password-protected, unsupported, image-only, oversized,
and too-many-page PDFs are rejected with safe messages. Uploaded filenames are
never used as paths or written to disk.

The PDF parse timeout bounds how long a request waits. It does **not** guarantee
that the parser's CPU work is terminated immediately, because JavaScript cannot
preempt synchronous/worker work deterministically. The parser is destroyed in a
`finally` block, and the process concurrency cap limits exposure.

## Getting started

This project uses **npm** and the committed `package-lock.json`.

```bash
npm install
npm run dev        # http://localhost:3000
```

Production-mode check:

```bash
npm run build
npm start          # http://localhost:3000
# or: npm start -- -p 3100
```

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm test` | Run the full Vitest suite once |
| `npm run type-check` | Run `tsc --noEmit` |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |

There is no separate lint script and no Playwright suite in this repository.

## Configuring optional AI review

The app works with **no AI configuration**. Rule-only mode is fully functional.

1. Copy `.env.example` to `.env.local` (never commit it).
2. Set all three required server-side variables:
   - `LLM_BASE_URL` — e.g. `https://provider.example/v1`
   - `LLM_API_KEY`
   - `LLM_MODEL`
3. Optional: `LLM_TIMEOUT_MS` (default 15000, clamped to 2000–60000).
4. Optional: `LLM_JSON_MODE=json_object` only if your provider supports
   `response_format: {"type":"json_object"}`.
5. Restart the server.

All variables are server-side. No `NEXT_PUBLIC_` variable is used. The endpoint
is administrator-configured only: it is never accepted from a user request, an
uploaded PDF, or the offer text. Missing or invalid configuration produces a
safe "AI review is unavailable" message, never a stack trace or credential.

### Provider assumptions

- OpenAI-compatible `POST {LLM_BASE_URL}/chat/completions` endpoint.
- `Authorization: Bearer <LLM_API_KEY>`.
- Model returns a chat message `content` (string, or text parts array).
- No tools, browsing, URL fetching, email sending, or function calling is
  requested or implemented.
- One attempt per analysis; no automatic retries.
- The raw PDF is never sent — only the reviewed text and optional contact fields.

## Rule-only mode and consent

- AI review requires the user to tick **"Also run AI review (optional)"**.
- Without consent, no provider request is made and only deterministic rules run.
- With consent, the reviewed text and any sender email / employer website the
  user entered are sent to the configured provider.
- If AI is requested but unavailable (no configuration, timeout, auth failure,
  provider rate limit, network error, malformed/schema-invalid output, or empty
  output), deterministic results remain visible and the mode says
  "Rule-based review completed; AI review unavailable."
- No canned output is substituted for live AI.

## Privacy and data flow

```
Browser → OfferShield server → optional external AI provider → browser result
```

- Offer text and PDFs are processed in memory for the request. The app has no
  database and does not permanently store raw documents, offer text, results, or
  drafts.
- PDF parsing uses in-memory buffers; no temporary files are written by the
  application.
- Document text, prompts, model responses, contact fields, and credentials are
  not logged. The only server log on an unexpected failure is a random request id
  and the error class name.
- API responses use `Cache-Control: no-store`. Sensitive analysis is not placed
  in URLs or browser storage.
- The UI uses no `localStorage` or `sessionStorage`.
- Results and the print report are rendered as plain text through React escaping;
  no `dangerouslySetInnerHTML` or raw HTML injection is used.
- The printable report is built in the browser only and is not uploaded. The
  complete source text is excluded unless the user explicitly includes it.
- The email draft exists only in page memory. Copying uses the browser clipboard;
  the app never sends email or chooses a recipient.
- **Provider retention caveat:** when AI review is enabled, data leaves
  OfferShield and is handled under the configured provider's terms. OfferShield
  cannot guarantee what that provider retains, for how long, or where. Review the
  provider's policy before enabling it with real data.
- **Clear review** removes the offer text, results, checklist progress, and email
  draft from the current app state. It does not guarantee forensic deletion from
  browser or operating-system memory, and it cannot remove data already sent to
  an external provider.

## Security and abuse controls

- **Body limits before parsing:** declared `Content-Length` is checked first, and
  the streamed byte count is capped as a fallback. Oversized requests get `413`
  with a safe `REQUEST_TOO_LARGE` message.
- **Rate limits:** 30 analysis requests/minute and 10 AI-consented
  requests/minute per client, with `429` and `Retry-After`. A per-process cap of
  4 concurrent analyses protects memory and CPU.
- **Trusted client identity:** forwarded IP headers are spoofable, so they are
  ignored unless the operator explicitly sets `TRUST_PROXY=true` behind a reverse
  proxy that overwrites `X-Forwarded-For`. Otherwise all requests share one
  conservative `"local"` bucket.
- **Local-only limiter:** the limiter is in process memory. It is **not** global
  across multiple instances, containers, or serverless invocations. The
  `RateLimitStore` interface exists so a shared store (for example Redis) can be
  added. **Public deployment is blocked until that is configured** (see below).
- **Headers:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `X-Frame-Options: SAMEORIGIN`, a restrictive `Permissions-Policy`,
  `Cross-Origin-Opener-Policy: same-origin`, and no `X-Powered-By`.
  A full Content-Security-Policy is not configured yet.
- **No URL fetching:** URLs in offers or contact fields are never requested.
- **Safe errors:** responses never include stack traces, credentials, provider
  bodies, or offer text.

## Evidence validation and merge policy

- AI candidate findings need a non-empty exact quotation.
- The quote is looked up in the original submitted text with
  `String.prototype.indexOf`; offsets are computed in code.
- No whitespace/case normalization is applied.
- Repeated quotations are matched deterministically: successive identical
  candidates consume successive occurrences; extras are rejected.
- Rejected quotations are omitted and the result is marked
  "Partial AI review; some output could not be validated."
- AI findings overlapping a rule finding in the same category mark it as `both`
  and keep the rule priority.
- Model text containing unsupported verdicts (for example "verified employer",
  "guaranteed safe", "definitely a scam", or fraud-percentage phrasing) is
  rejected in code.
- Unknown schema fields (including a model-supplied verdict or probability) make
  the response invalid and the AI review unavailable.
- Offer text is escaped inside the prompt's `<offer_text>` delimiters as defence
  in depth. This is not proof of prompt-injection resistance; see limitations.

## Overall-label policy (code-controlled)

1. Any finding (rule or validated AI) → **Concerning signals found**
2. Otherwise, a sender/employer domain difference or any missing/unidentified
   information → **Additional verification needed**
3. Otherwise → **No configured warning signals found**
4. Empty text / analysis failure → **Unable to complete analysis**

Every result also states: "This review does not establish whether the offer or
employer is genuine."

## Reliability behaviour

- AI failure preserves completed deterministic results and labels the mode
  honestly.
- Partial AI output is labelled and unvalidated items are omitted.
- Missing credentials do not break rule-only mode.
- Editing text, contact fields, or AI consent clears the previous results,
  checklist progress, email draft, and printable report.
- Stale responses cannot overwrite a newer analysis (request-id guard).
- A failed re-run clears old results rather than leaving them beside a failure.
- The server never logs offer content; a 500 response includes a generic message
  and an `X-Request-ID` for correlation.

## Troubleshooting

| Symptom | Likely cause / action |
| --- | --- |
| "AI review is unavailable because the server is not configured..." | `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` are not all set; restart after setting them. |
| "AI review is unavailable because the provider rejected..." | Check the API key and provider account. Do not paste keys into the browser. |
| "AI review timed out..." | Increase `LLM_TIMEOUT_MS` within 2000–60000 or use a faster model. |
| "Too many requests" (`429`) | Wait for `Retry-After`; the limiter is per process. |
| PDF rejected as corrupt | The file may be scanned/image-only, encrypted, or not a real PDF; paste the text instead. |
| PDF works in tests but fails in `next dev`/`next start` | Keep `serverExternalPackages: ["pdf-parse", "pdfjs-dist"]` in `next.config.ts`; pdfjs resolves its worker from `node_modules`. |
| `npm test` config warning | Only `vitest.config.mts` should exist; duplicate config files were removed. |
| Build fails on type errors | Run `npm run type-check` and fix before `npm run build`. |

## Known limitations

- Rules are conservative English-language pattern checks; they miss paraphrases,
  other languages, images/scanned PDFs, and many social-engineering tactics.
- Domain comparison uses the user-supplied website string; it does not verify
  ownership, registration, or reputation and never fetches the domain.
- Missing-information checks inspect only the supplied excerpt, not the full
  recruitment process.
- AI output is model-generated, may be incomplete or wrong, and is checked only
  for schema validity, content policy, and exact evidence quotations.
- Mocked provider tests validate application behaviour, **not** a live model's
  resistance to prompt injection.
- The in-process rate limiter is not shared across instances.
- The PDF parse timeout is a wait bound, not guaranteed CPU termination.
- No authentication, no multi-user accounts, no persistent history.
- A full CSP and CSRF-specific tokens are not implemented. The API accepts only
  same-origin JSON/multipart requests in the UI, but it has no authentication.
- AI review sends data to a third-party provider; retention depends on that
  provider.
- **Live AI integration has not been verified** in this environment because no
  credentials were configured.

## Manual verification checklist

Use fictional data only.

- [ ] Start with `npm run dev`; the page loads with no console errors.
- [ ] Submit pasted text; the review setup appears.
- [ ] Load the payment-request example and analyze: "Concerning signals found".
- [ ] Select a finding: the exact quotation is highlighted in the source text.
- [ ] Load the no-fee example and analyze: "No configured warning signals found".
- [ ] Edit the text after a review: results, checklist, draft, and report clear.
- [ ] Run the review with AI consent unchecked: no provider request is made.
- [ ] With AI consent checked but no configuration: rule results remain and the
      AI-unavailable mode is shown.
- [ ] Check a checklist item: progress changes, the overall label does not.
- [ ] Edit and copy the email draft; verify clipboard success/failure feedback.
- [ ] Print / Save as PDF: the source text is excluded unless opted in.
- [ ] Click **Clear review**: the app returns to the input state.
- [ ] Upload a text-based PDF under 5 MB and with 10 pages or fewer.
- [ ] Resize to a narrow viewport: source/findings panes switch without
      horizontal scrolling.
- [ ] Tab through the page: focus rings are visible and controls are reachable.
- [ ] Confirm no offer content appears in `localStorage`/`sessionStorage`.

## Deployment preparation (not deployed)

**Public deployment is currently blocked.** Before deploying:

1. Replace the in-process limiter with a shared `RateLimitStore` (for example
   Redis) so limits are global across instances.
2. Set `TRUST_PROXY=true` only behind a proxy that overwrites `X-Forwarded-For`,
   or keep the shared local bucket and accept stricter global limits.
3. Configure the AI provider through the platform's server-side secret store.
   Never use `NEXT_PUBLIC_` variables.
4. Verify the platform's request-body limit is at least the app's multipart cap,
   and that serverless timeouts exceed the PDF/AI wait bounds.
5. Run `npm ci`, `npm test`, `npm run type-check`, and `npm run build` in the
   deployment environment.
6. Perform an approved live-AI test with fictional text and confirm the
   provider's data-retention terms.
7. Add a full Content-Security-Policy and review CSRF/abuse protections for the
   intended hosting model.
8. Re-run the manual verification checklist against the deployed build.

No deployment, external account, or paid service was created during development.

## Testing notes

```bash
npm test
npm run type-check
npm run build
npm audit
```

The suite covers the analyzer, evidence offsets, AI merge policy, strict output
schema, provider failures/timeouts, consent gating, prompt delimiters, request
limits, rate limiting, client identity, PDF limits, stale responses, input
invalidation, clearing state, inert HTML rendering, and safe error messages. All
provider calls in tests are mocked; no real paid API is called.

See `docs/FINAL_VERIFICATION.md` for the exact commands run, results, and
outstanding checks.
