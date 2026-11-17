# Firebase AI Logic development and live verification

## Local workflow

Use Node 24 (validated: 24.22.1) and npm 11 with the existing checkout. Run:

```sh
cd /workspace/locallens
npm ci
npm test
npm run lint
npm run build
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Local profiling, cleaning, deterministic questions and tests need no cloud credentials. AI model requests require the registered Firebase Web App configuration. No paid service was enabled by this work.

Optional UI smoke test: with Chromium installed, run `node scripts/browser-smoke.mjs` from the repository root. `CHROMIUM_BIN` may specify Chrome's binary. It starts isolated dev/browser processes on ports 5175/9225, exercises sample loading, mode default, missing-config/unsupported behavior, consent gating and local chat, then removes its temporary browser profile. It is a UI test, not real inference. It explicitly clears `VITE_FIREBASE_` values in its child Vite process, so the missing-config test cannot start genuine inference even when the parent environment supplies real Firebase settings.

## Firebase Console prerequisites (owner action)

1. Select your intended project (`locallens-b4060` in the example) and registered Web App. Copy its **public web app config** into ignored `.env.local`, or configure environment variables securely in environment settings. Required fields: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. Copy real values; example placeholders are not credentials. Restart Vite after edits.
2. In Firebase AI Logic, explicitly enable/configure the Gemini Developer API backend for that project. This app uses `GoogleAIBackend`, not Vertex/Agent Platform. Check current supported model names and quota in your project. `VITE_FIREBASE_AI_MODEL` defaults to `gemini-2.5-flash`; override it with an enabled current model if that model is unavailable. Model availability is not established by compilation.
3. If the Console requires a billing plan, paid quota or a purchase, obtain project-owner approval first. Do not enable billing as part of onboarding. Pricing and availability vary by model/project; no free-tier guarantee is made.
4. Register the Web App in Firebase App Check using **reCAPTCHA Enterprise**, with an invisible **score-based** key and the checkbox challenge option disabled. Set the existing `VITE_FIREBASE_RECAPTCHA_SITE_KEY` variable to that public Enterprise site key; the application uses `ReCaptchaEnterpriseProvider`. Authorize the actual development/deployment origin in the key's domain settings and configure Firebase app restrictions as applicable. Check App Check request metrics and Firebase AI Logic enforcement separately; provider initialization does not prove token issuance, token acceptance, or enforcement.
5. Follow the [official Enterprise setup guide](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider). **Never add localhost to a key deployed or intended for production.** Test on an already authorized origin or use a separately registered development score-based Enterprise key. This verification workflow does not use debug tokens, custom providers or other App Check bypasses. Never put App Check debug tokens in `VITE_` variables or commits.
6. Restrict the public API key appropriately for your Firebase APIs and allowed origins. Never put Admin SDK/service-account credentials, a reCAPTCHA server secret or an unrestricted server Gemini key in client code.

The user has supplied all six environment variables: the four required Firebase Web App fields above, `VITE_FIREBASE_RECAPTCHA_SITE_KEY`, and `VITE_FIREBASE_AI_MODEL`. Presence alone does not establish valid registration, token acceptance, model availability or API enablement. Live verification confirmed Firebase initialization but was blocked before token acquisition by Chromium certificate trust (`ERR_CERT_AUTHORITY_INVALID`). No successful live inference is claimed; see [the Enterprise verification record](enterprise-verification.md). Local profiling and cleaning remain available independently.

## Browser requirements

Use a supported desktop Chrome with Prompt API access in a secure context (localhost or HTTPS), sufficient storage/memory and a supported device. Availability is determined by Chrome, not the presence of `LanguageModel` alone. A user gesture triggers Firebase's `initializeDeviceModel`; it can download Gemini Nano and report progress. Version/channel, hardware, enterprise policies, model downloads and regional availability may affect support. Do not claim mobile/other-browser compatibility without testing.

On-device-only uses a separate named Firebase app for the SDK, so its service cannot cache the primary cloud service before App Check is initialized. It requires Firebase configuration for Firebase AI Logic but does not initialize App Check or permit model-cloud fallback. The application independently rejects that mode if `LanguageModel` is absent: Firebase 13.4.0's absent-adapter dispatch must not be trusted as a privacy gate.

## Modes and consent

| Mode               | Behavior                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `only_on_device`   | Native Gemini Nano only; explicit unsupported/error state, no cloud fallback.                                                                            |
| `prefer_on_device` | Initialize native model; SDK can choose cloud when on-device is unavailable. Consent required before either request.                                     |
| `only_in_cloud`    | Firebase-hosted Gemini only; App Check and consent required.                                                                                             |
| `prefer_in_cloud`  | Cloud first; SDK falls back to native for its supported error classes when native is available. Not every API error triggers fallback. Consent required. |

As a conservative privacy gate, all cloud-capable modes, including both prefer modes, require successful public App Check token acquisition before model inference. If attestation is offline or rejected, those modes fail before the SDK can choose a native fallback; select `only_on_device` for inference independent of App Check. Native model initialization/download may happen first to preserve the recent user interaction.

The UI always displays SDK-reported **actual** source. Model version for browser-managed Nano is unknown and labeled as such. The cloud model label is the configured requested model ID, not a claim about its resolved backend revision. Invalid/missing provenance is rejected. Deterministic answers are not AI inference.

## Live verification checklist (not yet passed)

Use only non-sensitive demo data, inspect the exact aggregate payload, and retain a redacted test record with browser version, date, requested mode, actual source, project/model ID, result validity and failure details without keys or records.

- On supported Chrome: choose device only, download the model from a user click, generate insights and a follow-up. Confirm SDK actual source `on_device`. Inspect network requests to ensure the aggregate/question is not sent to Firebase AI Logic/cloud inference. Model-download traffic is separate from inference traffic.
- On unsupported Chrome/other browser: device only must show unsupported/error and make no cloud inference request. Presence of the API alone is insufficient.
- Cloud only: without consent, generation is disabled and service guard rejects calls. After consent, obtain a token through the public App Check `getToken()` API before sending demo aggregates. An `exchangeRecaptchaEnterpriseToken` HTTP 200 and successful token acquisition demonstrate token issuance; never print or retain the token itself. Then generate a summary and follow-up, confirm the request carries App Check, and verify the SDK reports `in_cloud` with valid evidence references. A successful token-bearing inference request demonstrates that request succeeded; it does not establish that Firebase Console enforcement is enabled. Check enforcement and request metrics separately. If token acquisition fails, stop the inference attempt without a debug or provider bypass; backend enablement remains unverified unless another authorized read confirms it.
- Prefer device: verify `on_device` on a working device and `in_cloud` on an unavailable device **with consent**. Do not treat mocked source changes as proof of SDK fallback.
- Prefer cloud: verify `in_cloud` normally, then a controlled SDK-supported network failure with native available to verify actual device fallback. Authentication, safety, validation and some quota failures may remain errors.
- Revoke consent, switch data/disclosure, and verify no new cloud request can occur. A request already sent cannot be recalled. No raw rows are included, and no AI result changes the dataset.
- Force blocked output, malformed JSON, missing/unknown citations, App Check rejection, API-disabled and quota errors. Verify actionable failure, no fabricated success, and continued local cleaning.
- Review generated claims against the attached evidence. Evidence IDs validate references, not semantic truth. Recommendations require manual review in the cleaning workspace.

## Official API compatibility references

Checked against installed `firebase@13.4.0`, `@firebase/ai` published declarations and browser implementation. Current upstream generated documentation and source retrieved during recovery:

- [Firebase official API index](https://github.com/firebase/firebase-js-sdk/blob/master/docs-devsite/ai.md)
- [HybridParams](https://github.com/firebase/firebase-js-sdk/blob/master/docs-devsite/ai.hybridparams.md)
- [GenerativeModel / initializeDeviceModel](https://github.com/firebase/firebase-js-sdk/blob/master/docs-devsite/ai.generativemodel.md)
- [EnhancedGenerateContentResponse / inferenceSource](https://github.com/firebase/firebase-js-sdk/blob/master/docs-devsite/ai.enhancedgeneratecontentresponse.md)
- [App Check API](https://github.com/firebase/firebase-js-sdk/blob/master/docs-devsite/app-check.md)
- [Official generative model implementation](https://github.com/firebase/firebase-js-sdk/blob/master/packages/ai/src/models/generative-model.ts)
- [Firebase hybrid guide](https://firebase.google.com/docs/ai-logic/hybrid-inference) and [App Check Enterprise web setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider) for project owners. The Enterprise guide was accessible during this provider update; the earlier recovery also consulted upstream official generated reference/source when website access returned HTTP 403.

Recheck current model availability and Console UI when configuring; these cannot be inferred from SDK types or an offline build.

## Repeat the genuine cloud check

From the repository root, run `node scripts/verify-cloud.mjs --consent-demo-cloud` only when authorized to contact the configured Firebase project. This opt-in command starts Chromium and Vite, verifies public App Check token acquisition, and then requests a structured insight report through the real application service using only synthetic 20-row, two-column demo aggregates. It does not send raw rows, use a debug provider, enable billing, or change Firebase settings.

The command retains TLS validation, honors the managed proxy, and reports only sanitized status/error metadata, token-presence booleans and SDK-reported inference source. It exits nonzero on failure; missing network responses are not proof that an API is disabled. Live checks are separate from unit tests and CI. Use an already authorized test origin or a separate registered development Enterprise key; do not add localhost to a production key. On this machine trusted browser HTTPS remains unresolved. Persistent CA installation is not permitted; temporary isolated trust was not established safely. Use the [Windows Chrome verification instructions](windows-cloud-verification.md), which preserve normal TLS and App Check security. App Check acceptance, backend enablement and genuine inference remain unverified.
