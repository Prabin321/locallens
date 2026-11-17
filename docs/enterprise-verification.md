# Enterprise App Check verification record

## Change and local validation

Continue `feat/checkpoint-3-recovery` from `a43965f`; main was not changed. Installed Firebase SDK: 13.4.0. App Check now uses `ReCaptchaEnterpriseProvider` with the existing `VITE_FIREBASE_RECAPTCHA_SITE_KEY` variable. The key value is neither committed nor printed.

Cloud-capable requests now require successful public App Check `getToken()` resolution before calling model inference. This prevents continuing past an attestation failure with the Firebase AI SDK's internal fallback token. The primary cloud AI service is still created after provider initialization, and the separate device-only app still skips App Check. No debug provider or custom-token bypass was used. This conservative gate also applies to both prefer modes: an attestation failure blocks their inference, including native fallback; select device-only when App Check is unavailable. Native initialization/download can precede token acquisition to preserve user interaction, but no generation runs until the gate passes.

Validation:

- `npm test`: **115 tests passed across 10 files**. Provider construction, token success/failure, and no inference after token failure are mocked unit tests, not live attestation or generation.
- `npm run lint`: passed without warnings.
- `npm run build`: TypeScript and Vite production build passed.
- `node scripts/browser-smoke.mjs`: passed sample loading, dashboard, consent gating, local deterministic assistant and simulated absent-native-API failure. The test's Vite child explicitly masks Firebase configuration, so it cannot start a live inference request with the newly injected settings.
- `node --check scripts/verify-cloud.mjs`: passed. This opt-in script is separate from automated tests and requires `--consent-demo-cloud` before it can contact Firebase.

## Genuine browser attempt

Run with real supplied Firebase settings and a fresh Chromium profile, not mocked services. Browser: Chromium 156.0.8078.79 on Debian 13. The intended request uses a synthetic 20-row, two-column dataset and only the context builder's default aggregate counts/scores, never raw rows.

| Check | Observed result |
| --- | --- |
| Required environment values | All four required Web App fields, Enterprise site key and model setting present; values not printed |
| Firebase initialization | Successful; no missing required fields; expected project matched |
| App Check provider | Enterprise provider initializes locally |
| Google reCAPTCHA browser resource | Failed with `net::ERR_CERT_AUTHORITY_INVALID` |
| Shell request to the same keyless Enterprise script | HTTP 200 with normal certificate verification |
| Genuine Enterprise token issuance | **Not verified**; browser could not load reCAPTCHA |
| Token acceptance by Firebase AI Logic | **Not verified**; no AI request was sent |
| SDK-reported inference source | **No result / unavailable**, not `in_cloud` |
| Firebase AI Logic / Gemini Developer API enablement | **Unverified**; the check stopped before reaching those APIs, and no managed Google Cloud identity was supplied for an independent administrative read |

The token check remained pending until the diagnostic deadline because the browser could not load the Enterprise script. No model request or demo data transmission to Firebase AI Logic occurred. This is a browser TLS trust blocker, not evidence of an invalid Enterprise key, disabled backend, insufficient quota or a required billing change.

The system-trusted managed proxy CA is present on disk, but missing from Chromium's NSS trust database. Automatic approval review rejected adding it to that persistent database because this changes TLS trust for future browsing. The import was **not** performed; TLS verification was not disabled. Resuming live verification needs an approved trust configuration or another properly trusted, authorized browser environment.

## Console checks after resolving browser trust

No additional Console change has been proven necessary yet. The registration is reported complete by the owner. Once browser HTTPS works, check these only as indicated by live responses and Console state:

1. The configured key is an Enterprise **score-based** key for the correct registered Web App, with checkbox challenges disabled.
2. The origin used for the check is authorized. Do not add localhost to a production key; use an already authorized origin or a separately registered development Enterprise key.
3. Firebase AI Logic setup selects the Gemini Developer API (`GoogleAIBackend`), with the required Firebase AI Logic and Gemini Developer APIs enabled, and the configured model available for that project/quota. Local SDK construction does not prove service enablement.
4. App Check metrics show accepted tokens and the intended Firebase AI Logic enforcement setting. Token issuance and even a successful token-bearing inference do not establish enforcement is enabled.

No billing, purchases, Console settings, environment publication or main-branch merge were performed. Genuine cloud inference remains pending; mocked test success is not a substitute.

See [setup instructions](firebase-ai-setup.md) for the opt-in verifier and official Enterprise documentation.
