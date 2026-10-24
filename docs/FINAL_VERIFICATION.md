# OfferShield — Final Verification

Date of verification: 2026-10-24
Environment: Windows, Node.js (system install), npm, local machine. No deployment
was performed.

## Readiness summary

| Category | Status |
| --- | --- |
| Local demo ready | **Yes** — production build served locally and exercised |
| Live AI verified | **No** — no credentials configured, no live test approved |
| Public deployment ready | **No / blocked** — see blockers below |

This document records what was actually executed. It does not claim
"production-ready" or "fully secure".

## Commands actually run and outcomes

| Command | Outcome |
| --- | --- |
| `npm test` | **Passed** — 20 test files, 188 tests |
| `npm run type-check` | **Passed** — no TypeScript errors |
| `npm run build` | **Passed** — Next.js 16.4.3 production build |
| `npm audit --json` | **0 vulnerabilities** (info/low/moderate/high/critical all 0 at run time) |
| `npm start -- -p 3100` | **Started** and served the production build |
| `npx vitest run tests/app/api/analyze.test.ts tests/lib/llm/prompt.test.ts` | **Passed** — 18 tests (intermediate focused run) |

Playwright is **not installed** in this repository, so no Playwright E2E suite was
run. `package.json` contains no Playwright dependency or script.

### Production build route output

```
Route (app)
┌ ○ /
├ ○ /_not-found
└ ƒ /api/analyze
```

## Automated test coverage (188 tests)

The suite includes:

- Deterministic analyzer patterns, labels, missing information, and contact
  comparisons.
- Evidence offset validation, repeated quotations, and AI merge policy.
- Strict AI output schema and rejection of unsupported verdicts/probabilities.
- Provider success, timeout, auth failure, HTTP failure, malformed/empty output.
- Consent gating: no provider request without opt-in.
- Prompt delimiter escaping and contact-field sanitization.
- Request-body limits, malformed JSON, oversized text, unsupported content types.
- Rate limiting, `Retry-After`, client identity/`TRUST_PROXY`, concurrency slots.
- PDF size/page/text limits, corrupt/encrypted/image-only rejection, valid-PDF
  extraction, and parser cleanup.
- Stale responses, edited-input invalidation, duplicate-submit prevention.
- Unsafe HTML-like input rendered as inert text.
- Clear-review state reset.
- No secret/provider details in error responses.

All provider calls in tests are mocked. **A mocked test is not proof of a live
model's prompt-injection resistance.**

## Secret and configuration checks

| Check | Result |
| --- | --- |
| `LLM_*`, `NEXT_PUBLIC_*`, `TRUST_PROXY` in the process environment | None set during verification |
| `NEXT_PUBLIC` references in `src/` or `tests/` | None |
| Secret-like literals (`sk-...`, `Bearer ...`) in `src/` | None |
| Secret/test-key strings in `.next/static` bundles | None found |
| Environment files present | `.env.example` only (placeholders) |
| `.gitignore` excludes env files and build output | Yes |
| AI endpoint source | Server environment only; never user-controlled |
| Provider/config errors | Safe user-facing messages; no stack traces or credentials |

No exposed secret was found. No revocation or rotation was required.

## Browser checks performed (production build)

Checked with the browser automation tools against `http://localhost:3100`:

- Loaded the app; no console messages or uncaught errors.
- Loaded the fictional payment-request example, submitted text, and analyzed.
- Confirmed the code-controlled label "Concerning signals found" and the mode
  "Rule-based review only."
- Confirmed evidence marks contain the exact quotations
  `pay the registration fee` and `transfer the security deposit`.
- Selected a finding and confirmed the selected evidence range started at
  character offset 79 with the status announcement naming the finding.
- Confirmed `localStorage` and `sessionStorage` contained no keys.
- Clicked **Clear review**; the app returned to the input state, the offer text
  was empty, results were gone, and storage remained empty.
- Uploaded a generated valid single-page text PDF; the API returned `200` with
  extracted text.
- Confirmed response headers: `Cache-Control: no-store`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, and no
  `X-Powered-By`.
- Sent 31 rapid requests; the 31st returned `429` with
  `Retry-After: 26` and a safe `RATE_LIMITED` message.

### Important bug found and fixed during verification

The first production smoke test rejected every valid PDF as `CORRUPT`. Server
logs showed pdfjs could not resolve
`.next/server/chunks/pdf.worker.mjs`. `pdf-parse`/`pdfjs-dist` were being bundled
into Next's server output. Adding
`serverExternalPackages: ["pdf-parse", "pdfjs-dist"]` to `next.config.ts` fixed
PDF extraction in both development and production. This is why a production-mode
smoke test was necessary; unit tests alone did not catch it.

## Not verified / manual checks still required

| Check | Why it remains manual |
| --- | --- |
| Live AI review | No provider credentials configured and no live test approved. Must be run with fictional text and an approved provider. |
| Real prompt-injection resistance | Requires a live model; mocked tests only cover application-side handling. |
| OS clipboard permission prompt | Browser automation cannot fully reproduce real clipboard permission UX. |
| True print preview / printed output | Depends on the OS/browser print dialog; not captured here. |
| Screen-reader pass | Accessibility snapshot and keyboard flow were checked in M5, but no real screen-reader session was run. |
| Mobile physical device | Responsive layout was checked in M5 at 390 px; no physical device test. |
| Multi-instance rate limiting | The current limiter is per process; requires a shared store to test. |
| Load/stress behaviour | No load test was performed. |
| Provider data retention | Depends on the chosen provider's terms; must be reviewed by the operator. |

Manual steps for the unverified items:

1. **Live AI:** configure `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`; restart;
   run a fictional example with AI consent; confirm
   "Rule-based + AI review completed." or an honest unavailable/partial state.
2. **Clipboard:** click a copy button; accept/deny the browser permission and
   confirm the success/failure message.
3. **Print:** open the print dialog, inspect the preview, and confirm source text
   is excluded unless opted in.
4. **Screen reader:** tab through the page with a screen reader and confirm the
   evidence selection announcement and dialog focus behaviour.
5. **Mobile:** repeat the text journey on a physical phone.
6. **Provider retention:** read the provider's data policy before using real
   offer text.

## Security and privacy limitations

- The rate limiter is in process memory. It does not work globally across
  multiple instances, containers, or serverless invocations, and it resets on
  restart. A `RateLimitStore` abstraction exists, but no shared store is
  configured.
- No authentication, user accounts, or persistent history. The API has no
  authentication and relies on deployment-level protections.
- No full Content-Security-Policy and no CSRF-specific token. Security headers
  and `no-store` caching are configured.
- The PDF parse timeout bounds request waiting, not guaranteed CPU termination.
- Image-only/scanned PDFs are rejected rather than OCR'd.
- Domain comparison uses user-supplied strings and does not verify ownership.
- The app cannot control an external AI provider's retention. The UI says so.
- "Clear review" clears application state; it does not guarantee forensic
  deletion from browser/OS memory or from a provider.
- `npm audit` reported no known vulnerabilities at run time. That does not prove
  the dependency tree is free of unknown issues.

## Public-deployment blockers

1. **Shared rate limiting is not configured.** Public deployment is blocked until
   the in-process limiter is replaced with a shared store.
2. **Live AI is unverified.** The provider path, latency, cost, and output
   handling have not been tested against a real endpoint.
3. **No deployment/security review** has been performed for the intended host
   (proxy trust, body limits, timeouts, secrets, CSRF/CSP).
4. **Provider retention terms** must be reviewed and accepted by the operator.
5. **No authentication or abuse model** for a public, multi-user deployment.

## Exact steps to run the finished project

```bash
cd offer-shield
npm install
npm run dev
# open http://localhost:3000
```

Production-mode local run:

```bash
npm run build
npm start
# open http://localhost:3000
```

Optional AI review (server-side only):

```bash
# .env.local (never commit)
LLM_BASE_URL=https://your-openai-compatible-endpoint.example/v1
LLM_API_KEY=your-api-key-here
LLM_MODEL=your-model-name
# optional
LLM_TIMEOUT_MS=15000
# LLM_JSON_MODE=json_object
```

Verification commands:

```bash
npm test
npm run type-check
npm run build
npm audit
```

## Hackathon submission checklist

- [x] Working local demo with rule-based review.
- [x] Optional AI path implemented with consent and safe fallback.
- [x] Evidence highlighting with exact quotations.
- [x] Verification checklist and editable email draft.
- [x] Browser print/Save-as-PDF report.
- [x] Privacy/security hardening and automated tests.
- [x] README, demo script, project summary, and this verification document.
- [ ] Live AI demonstration verified with an approved provider.
- [ ] Shared rate limiting configured.
- [ ] Deployment/security review completed.
- [ ] Public deployment performed (not requested; not done).

No deployment, push, external account, or paid service was created.
