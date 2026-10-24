# OfferShield — Agent Guidelines

## Project overview
OfferShield is a hackathon web application that helps students review
internship/job offer messages and text-based offer-letter PDFs.

## Approved architecture (M1 scaffold)
- Next.js (App Router) + TypeScript + Tailwind CSS.
- Source layout: `src/app/`, `src/components/`, `src/lib/` (no root-level app dir).
- Server-side API routes live under `src/app/api/`.

## Agreed boundaries
- MVP: no authentication, no permanent document storage.
- AI: server-side OpenAI-compatible provider adapter configured only through
  server environment variables (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`);
  deterministic checks always run, and AI review is optional user opt-in.
  Rule-only mode is clearly labeled and never presented as AI output.
- No outbound fetching of URLs found in offers; only the explicitly configured AI endpoint
  is allowed in live mode.
- Evidence offsets must map back to the original submitted text.
- Result labels limited to: "Concerning signals found", "Additional verification needed",
  "No configured warning signals found", "Unable to complete analysis".
- Never use: "Verified employer", "Guaranteed safe", "Definitely a scam",
  or fraud percentage probabilities.
- Every result must state this is a limited review, not proof of authenticity.

## Milestone process
- Milestones: M1 Scaffold → M2 Input & Validation → M3 Deterministic Checks → M4 LLM Adapter
  → M5 Results UI → M6 Privacy/Security → M7 Docs & Tests.
- Implement one milestone at a time; wait for user approval before starting the next.
- After each milestone: run relevant tests and type checking; report what was actually
  executed; list unresolved issues; do not claim success without verification.

## Verification commands
- Type check: `npm run type-check`
- Tests: `npm test`
- Build: `npm run build`
- Dev: `npm run dev` → open http://localhost:3000

## Current status
- M1: scaffold created and verified; approved by user.
- M2: input/validation implemented and verified; approved by user.
- M3: deterministic analyzer, evidence offsets, result labels, examples, and review UI
  implemented; 34 tests passed; approved by user.
- M4: optional server-side AI adapter, strict output schema, evidence validation, merge
  policy, consent UI, docs, and mocked tests implemented; 95 tests passed; browser checks
  of the rule-only, consent-fallback, highlight, and edit-invalidation flows passed; live
  AI integration NOT verified (no credentials configured); approved by user.
- M5: results experience implemented — split-view evidence with offset highlighting,
  contact comparisons, missing-information cards, finding-derived verification checklist,
  deterministic editable verification email, and browser-printed report with source text
  excluded by default. 146 tests passed, type-check and production build passed; browser
  checks covered selection/keyboard flow, checklist progress, clipboard success/failure,
  print source opt-in, edit/re-run warnings, input invalidation, no-warning and
  AI-unavailable states, and 1200px/390px layouts without horizontal overflow. True print
  preview and real OS clipboard permissions were not fully verifiable in this environment;
  live AI remains NOT verified. Awaiting user approval.
- M6: privacy/security/reliability hardening implemented — server-only AI config verified,
  request-body ceilings, content-based PDF validation, page/text limits, safe parse timeout,
  in-process rate limiting with trusted-proxy configuration, concurrency cap, no-store API
  caching, security headers, prompt-delimiter escaping, hardened contact schemas, clear-review
  action, and safe error responses. 188 tests passed, type-check and build passed, npm audit
  reported 0 vulnerabilities. A production smoke test found and fixed a real pdfjs worker
  resolution bug by externalizing `pdf-parse`/`pdfjs-dist`; PDF upload, text analysis,
  evidence highlighting, clear review, headers, and 429 behaviour were then verified against
  the production build. Live AI remains NOT verified. Public deployment is BLOCKED pending a
  shared rate-limit store and live-AI/deployment review.
- M7: README rewritten; `docs/DEMO_SCRIPT.md`, `docs/PROJECT_SUMMARY.md`, and
  `docs/FINAL_VERIFICATION.md` created. Final verification completed; awaiting user approval.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
