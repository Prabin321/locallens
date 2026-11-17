# Genuine cloud verification on Windows Chrome

Use the existing repository and branch `feat/checkpoint-3-recovery`. These steps exercise real Firebase App Check and Gemini inference, rather than mocked tests. These instructions do not install proxy certificates, add TLS exceptions, use browser security flags or an App Check debug provider, deploy, merge, or activate paid services. These Windows steps have been reviewed against the repository, but have not been executed on the owner's Windows machine.

## 1. Choose a trusted browser and a development registration

Use current, normally configured Windows Chrome, preferably a separate regular Chrome test profile to avoid previously cached debug tokens. Do not launch it with certificate, web-security or sandbox-disabling flags. First open `https://www.google.com/recaptcha/enterprise.js`. Confirm Chrome accepts HTTPS without a certificate warning; this checks browser connectivity, not Firebase registration. If your workplace intercepts HTTPS, use an environment already configured by your IT administrator. Stop on certificate errors rather than clicking through them or importing a CA from this chat.

Check the existing Enterprise key's allowed domains before starting:

- If you already have a **development Firebase Web App** whose App Check Enterprise registration uses a score-based key authorized for `localhost`, use that app's public config and key.
- If your only key is deployed or intended for production, **do not add localhost to it, disable domain verification, replace its App Check registration, or lower production enforcement**. For genuine localhost attestation, an owner needs a separate development Web App and a corresponding Enterprise score-based key, registered together in Firebase App Check. Keep the checkbox challenge disabled and allow the development hostname `localhost`, without a scheme, port or path. Merely substituting another site key while keeping an unrelated production App ID will not validate the new registration.
- Reuse the intended project if appropriate. If a new registration or service setup asks you to enable billing, purchase quota, upgrade a plan or activate a paid service, **stop and report the prompt**. These instructions do not authorize that action.
- Alternatively, use an already authorized testing origin with a trusted existing deployment of this branch. Running Vite on localhost does not change the browser's origin into that remote domain; do not fake that origin or bypass its domain checks.

In Firebase Console, inspect **Firebase AI Logic** and verify that the selected backend is the **Gemini Developer API**, matching `GoogleAIBackend` in the application. In the associated Google Cloud project, inspect APIs & Services for Firebase AI Logic (`firebasevertexai.googleapis.com`) and the Generative Language / Gemini Developer API (`generativelanguage.googleapis.com`). Inspect App Check registration and enforcement for the chosen Web App and AI Logic. If anything is disabled or unavailable, record its status; do not enable paid services or disable App Check to force success. Confirm your chosen model is available within the project's existing quota.

Official registration guide: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider

## 2. Update the existing checkout

Open PowerShell. Substitute your real checkout path:

```powershell
Set-Location 'C:\path\to\locallens'
git status --short
```

If this shows local work, preserve it before switching. Do not use reset, clean or an overwrite to discard it. With a clean checkout:

```powershell
git fetch origin
git switch feat/checkpoint-3-recovery
git pull --ff-only origin feat/checkpoint-3-recovery
git branch --show-current
git log -1 --oneline
node --version
npm.cmd --version
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

If the local feature branch does not yet exist, use `git switch --track origin/feat/checkpoint-3-recovery` instead of the plain switch. Stay on the feature branch. Use Node 24 and npm 11, the validated toolchain. `npm.cmd` avoids requiring a PowerShell execution-policy change. Unit tests, lint and build do not contact real models and do not establish live inference success.

## 3. Configure only the local development app

Create `.env.local` only if it does not already exist:

```powershell
if (-not (Test-Path '.env.local')) {
    Copy-Item '.env.example' '.env.local'
}
notepad .env.local
```

Fill these six fields with the correct **development Web App** public config, the Enterprise site key registered to that same app, and a currently available model ID. Values shown below are descriptions, not working values:

```dotenv
VITE_FIREBASE_API_KEY=<development-web-app-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<development-web-app-auth-domain>
VITE_FIREBASE_PROJECT_ID=<intended-project-id>
VITE_FIREBASE_APP_ID=<development-web-app-app-id>
VITE_FIREBASE_RECAPTCHA_SITE_KEY=<matching-enterprise-score-based-site-key>
VITE_FIREBASE_AI_MODEL=<model-enabled-within-existing-project-quota>
```

Replace all placeholders. The example defaults to `gemini-2.5-flash`, but that is not proof of current project availability. Copy optional Firebase fields from the same config if used; remove unused example placeholders. Do not put a server secret, service-account key or App Check debug token in any `VITE_` variable. `.env.local` is ignored by Git; do not commit it or send its contents in chat. Codex environment variables do not automatically transfer to Windows. Existing shell `VITE_FIREBASE_` values override `.env.local`; use the intended development values consistently.

Start Vite on loopback:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Keep this PowerShell window running. Open **`http://localhost:5173`** in the trusted Chrome test profile. Use `localhost` consistently; do not substitute `127.0.0.1` in the browser when only `localhost` is registered. Restart Vite after changing environment values. Do not change Vite to listen on all interfaces merely for this local test.

## 4. Create and upload synthetic demo data

In a second PowerShell window:

```powershell
$demoPath = Join-Path $env:TEMP 'locallens-cloud-demo.csv'
$demoRows = 1..20 | ForEach-Object {
    $category = if ($_ % 2 -eq 0) { 'alpha' } else { 'beta' }
    "$_,$category"
}
(@('quantity,category') + $demoRows) | Set-Content -Path $demoPath -Encoding ascii
$demoPath
```

This creates 20 synthetic rows and two columns. In LocalLens, use **Browse CSV File** and select that temporary file. Confirm the overview shows 20 rows and two columns. Use no private data.

## 5. Verify initialization and real Enterprise token issuance

Open Chrome DevTools with F12 **before** starting App Check. In **Network**, enable Preserve log. Do not export a HAR, copy request headers, print token responses, or share key-bearing URLs.

On this trusted local development page, run the following in the DevTools Console. It imports existing application helpers, checks configuration, and obtains a genuine token through the public Firebase SDK; it never prints the token:

```javascript
await (async () => {
  const firebase = await import('/src/lib/firebase.ts');
  const diagnostics = firebase.getFirebaseDiagnostics();
  console.table({
    initialized: diagnostics.isInitialized,
    missingRequiredFields: diagnostics.missingKeys.length,
    expectedProject: diagnostics.isExpectedProject,
    sdkVersion: diagnostics.sdkVersion
  });
  if (!diagnostics.isInitialized || diagnostics.missingKeys.length) {
    throw new Error('Stop: Firebase configuration is incomplete.');
  }
  if (globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN) {
    throw new Error('Stop: this test must not use an App Check debug token.');
  }
  const appCheck = await import('/src/lib/appCheck.ts');
  await appCheck.verifyAppCheckToken();
  console.info('Public App Check token check succeeded; token not displayed.');
})();
```

Expected: initialized `true`, zero missing fields, and the success line. If you deliberately use a separate development project, `expectedProject` may be false because the app expects `locallens-b4060`; confirm you are testing the intended project before proceeding. Initialization alone does not check whether Google APIs are enabled.

Filter Network by `exchangeRecaptchaEnterpriseToken`. With a fresh profile, the **POST** to `firebaseappcheck.googleapis.com` should return **200**. That verifies a real Enterprise attestation exchange and token issuance. A previously cached valid token can make the public SDK call succeed without a new exchange; do not confuse a cached result with a fresh exchange. Use the fresh test profile to record issuance. Do not copy the token response. On failure, stop before inference and record only sanitized status/error codes.

## 6. Request real cloud insights

1. Open **AI Insights** and select **Cloud only**.
2. Leave optional aggregate columns unchecked. Expand **Inspect exact aggregate payload**. The default context should have nine facts: dataset counts and quality scores, with 20 rows and two columns. It must contain no raw rows, `alpha`/`beta` category values, dataset filename or original column names.
3. Before consent, confirm **Generate AI insights** is disabled.
4. Grant consent for the displayed aggregates and click **Generate AI insights** once. Do not repeatedly retry quota or attestation failures.
5. In Network, filter by `generateContent`. Identify the actual **POST**, not just an OPTIONS preflight, to `firebasevertexai.googleapis.com`. Confirm HTTP **200**, inspect the JSON request for minimized aggregates, and confirm an `X-Firebase-AppCheck` request header is present. Inspect presence locally without copying its value. A valid App Check token by itself is not proof that inference succeeded.
6. Confirm the dashboard renders a validated report and displays **Actual source: in_cloud** with the configured model. Export JSON if desired: it must contain `requestedMode: "only_in_cloud"`, `inferenceSource: "in_cloud"`, a generated summary and an evidence snapshot. This metadata comes from the SDK, not a model-written source label.
7. Inspect claims against the attached facts. A 200 response followed by a parser/evidence-validation error proves only that the transport returned output, not a passing end-to-end LocalLens workflow. Report those outcomes separately.
8. Optional: ask **“What limitations should I consider before interpreting these aggregates?”** and confirm another token-bearing cloud request and actual cloud source. A row-count or supported statistics question is answered deterministically on-device and does not verify Gemini inference.
9. Revoke cloud consent and confirm future cloud generation is disabled. Check that the dataset is unchanged. Already transmitted requests cannot be recalled.

In Firebase Console, inspect App Check request metrics for the chosen app and AI Logic after the run; allow for metrics delay. Record accepted/verified requests and the actual enforcement setting. A successful token-bearing request demonstrates that request worked; it does **not** independently establish enforcement is enabled. Do not lower enforcement or modify production settings for this test.

## 7. Diagnose failures without weakening security

| Observation | Next safe check |
| --- | --- |
| Certificate error | Stop. Use a correctly trusted Windows/browser environment or contact its administrator; no exceptions or CA imports from chat. |
| Invalid domain, invalid site key, or attestation rejection | Check development hostname, score-based key type and matching Firebase Web App/App Check registration. Do not alter the production key or disable domain verification. |
| App Check exchange 400/403 | Record status and sanitized error reason; check registration and App Check metrics. Do not substitute a debug/custom token. |
| Inference 403 | Inspect API enablement, API-key restrictions and App Check acceptance in Console. Do not assume billing is required or disable enforcement. |
| Inference 404 | Check the configured model's current project availability and API/backend configuration. Do not silently change to a paid model. |
| Inference 429 | Respect any retry interval and existing quota; do not purchase quota or enable billing. |
| Inference 200 but report rejected | Record a structured-output/validation failure separately from transport success. Do not relax validation to force a pass. |
| No response or no source | Treat as unverified; do not label it cloud success. |

## 8. Share a sanitized result

Report this checklist without credentials, tokens, raw records, request URLs containing keys, or HAR files:

```text
Feature branch commit:
Windows Chrome version:
Origin: localhost:5173 (or the authorized testing origin)
App Check provider: Enterprise score-based; debug provider absent
Firebase initialized / missing field count:
Enterprise exchange POST HTTP status:
Inference POST HTTP status:
X-Firebase-AppCheck present: yes/no
SDK actual inferenceSource:
Requested mode: only_in_cloud
Validated report and evidence rendered: yes/no
App Check metrics / Console enforcement setting:
AI Logic Gemini Developer API backend / API enablement status:
Sanitized error code, if any:
```

The following are still unverified until this test succeeds: real Enterprise issuance and token acceptance, real Gemini cloud output, SDK actual `in_cloud` source, backend/model availability, and Console enforcement. Nano and hybrid fallback scenarios are separate live checks and remain unverified even if cloud-only succeeds.
