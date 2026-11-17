# Checkpoint 3 recovery audit

## Recovery baseline

- Stable `main`: `b09caca8729b2d9c2e4103a6a9d39fa7c57fe867`.
- Latest recovered WIP: `061671fd84d385729a9a7e7db7f946bc3270c6d8` (following `f8ad327`).
- Work continues on `feat/checkpoint-3-recovery`, derived from that WIP. Main was not overwritten.
- WIP changes: five new files, 528 lines; no inference wiring, dashboard, new dependencies, or AI tests.
- Baseline validation: `npm ci`, all 49 existing tests, lint and production build passed. This did not validate AI inference.

## Antigravity implementation findings

| File                                 | Recovered state            | Finding and resolution                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/ai.ts`                    | Partial types, unused      | Replaced with typed evidence, context, reports, chat and provenance.                                                                                                                                                                                                                                                        |
| `src/lib/ai/contextBuilder.ts`       | Aggregate prompt helper    | Included filenames, category values, date extrema, free-text issue/cleaning descriptions and potentially sensitive numeric summaries. Keyword filtering incorrectly claimed prevention. Replaced with an allowlisted facts representation, aliases, opt-in columns, sensitive-name exclusion, and small-sample suppression. |
| `src/lib/ai/deterministicQueries.ts` | Local calculations, unused | Integrated into assistant; removed an unjustified distribution-shape inference from mean/median alone. Answers remain local.                                                                                                                                                                                                |
| `src/lib/ai/responseParser.ts`       | Permissive JSON extraction | Accepted wrong nested types and invented fallback text/citations. Replaced with bounded runtime validation and rejection of missing/unknown evidence.                                                                                                                                                                       |
| `src/lib/appCheck.ts`                | Unused initializer         | Development could report configured without a provider; debug token from VITE variable could enter a public bundle. Replaced with explicit provider initialization, accurate diagnostics, and no automatic debug token.                                                                                                     |

Missing at recovery: all real inference transport, all mode selection/consent UI, source reporting, summaries/recommendations/chat integration, insights dashboard, exports, and new tests.

## Implemented workflow

Firebase AI Logic SDK hybrid transport (`getAI`, `getGenerativeModel`, `HybridParams`), all four modes, Chrome model initialization/download progress, explicit cloud consent including fallback, SDK-reported source, and App Check prerequisite for cloud. Unsupported native API fails closed before SDK creation. In installed Firebase 13.4.0, no Chrome adapter can mean cloud dispatch even for a requested device mode; the independent guard is essential.

The dashboard uses the **current cleaned snapshot** and recomputed statistics. No cleaning callbacks or tools are passed to AI. Undo/redo and resetting data remount the AI workspace; changing disclosure clears reports, consent, and conversation. Only local deterministic replies can include original column names and exact extrema. Model conversation history excludes those deterministic replies.

Implemented outputs: summary, quality explanations, descriptive insights, risk-bearing manual cleaning advice, next analyses, limitations, follow-up assistant, and Markdown/JSON export with evidence and actual source. Column semantic roles/purpose, causal inference and cross-column correlations are deliberately not guessed from anonymized marginal aggregates.

## Security review

- Default payload is counts and quality scores. No raw rows or raw-record cloud option exists.
- Column disclosure requires explicit opt-in, uses positional aliases, excludes sensitive-name heuristics, suppresses numeric aggregates below ten valid observations, and omits extrema, categories, dates, filenames, history descriptions and rule prose.
- Heuristics miss unknown sensitive fields; aggregates and questions can still identify people. This is minimization, not anonymization or differential privacy.
- Cloud modes, including fallback, fail before model creation unless consent is granted. Consent covers displayed aggregates, questions and bounded AI conversation history. No automatic model calls; consent is not persisted. Requests have cancellation and a three-minute overall deadline; unmounting aborts pending work. Revocation stops future requests, not requests already transmitted.
- System instructions and untrusted JSON data are separated for cloud and native prompts. No model tools, code execution, HTML rendering or cleaning actions. Model text is escaped by React, and Markdown export strips active markup delimiters. Keyword filtering is not a security boundary and does not guarantee prevention.
- Runtime validation checks bounded field types and evidence IDs, drops extra fields and model-supplied provenance, and rejects invalid output. Evidence ID validation does **not** prove numerical or semantic correctness; users must inspect cited facts. Hallucinations and prompt injection remain possible.
- Source is obtained only from `response.inferenceSource`; unknown or contradictory source metadata is rejected. Local deterministic answers are labeled separately.
- App Check must actually initialize before the primary cloud AI service is created. Device-only uses a separate named Firebase app to avoid caching a cloud service without its App Check provider. Successful initialization alone does not prove token acceptance; Firebase Console enforcement and live requests are still required.
- Firebase public web config is not an Admin credential. App Check debug tokens must never be put into `VITE_` variables or commits.

## Validation and honest limits

Current validation: 109 tests across 10 files pass, lint passes without warnings, TypeScript + Vite production build pass. New service tests mock the transport and validate integration contracts, not actual model output or Firebase fallback behavior. Existing 49 profiling, cleaning and quality tests remain passing.

A real Chromium browser loaded the app and employee sample (20 rows, 9 columns), rendered the AI dashboard, verified device-only default, handled missing configuration, blocked cloud generation without consent and answered a local row-count question without inference network calls. No runtime exceptions occurred. Native `LanguageModel` exists in this machine, but its availability query did not resolve within a three-second diagnostic window. This is not proof of readiness or of unsupported hardware.

**No real Nano or cloud inference succeeded in this environment.** No Firebase app variables, reCAPTCHA site key, App Check registration or authorized model project were provided. This implementation is ready for configured development and live verification, not certified hybrid inference. Follow `docs/firebase-ai-setup.md` before merging as production-ready.

The Firebase website returned HTTP 403 here. Current official generated API reference and source were retrieved from the Firebase SDK upstream repository, and checked against the installed declarations and implementation. See the setup guide for exact references.
