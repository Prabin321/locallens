// Opt-in LIVE check. Sends only synthetic demo aggregates to configured cloud AI.
// Never prints configuration values, App Check tokens, headers or raw network URLs.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

if (!process.argv.includes('--consent-demo-cloud')) {
  console.error(
    'Requires --consent-demo-cloud: authorizes a real Firebase App Check exchange and a cloud request containing synthetic demo aggregates. No billing is enabled.',
  )
  process.exit(2)
}
const profileDir = mkdtempSync(join(tmpdir(), 'locallens-cloud-'))
const vite = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '5176',
    '--strictPort',
  ],
  { stdio: 'ignore' },
)
const flags = [
  '--headless',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--remote-debugging-port=9226',
  `--user-data-dir=${profileDir}`,
]
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy
if (proxy) {
  const url = new URL(proxy)
  flags.push(`--proxy-server=${url.origin}`)
  const bypass = process.env.NO_PROXY || process.env.no_proxy
  if (bypass) flags.push(`--proxy-bypass-list=${bypass.split(',').join(';')}`)
}
const browser = spawn(
  process.env.CHROMIUM_BIN || 'chromium',
  [...flags, 'about:blank'],
  { stdio: 'ignore' },
)
let startupError
for (const child of [vite, browser])
  child.on('error', (e) => {
    startupError = e
  })
const sensitiveValues = Object.entries(process.env)
  .filter(
    ([key, value]) =>
      key.startsWith('VITE_FIREBASE_') &&
      value &&
      key !== 'VITE_FIREBASE_AI_MODEL',
  )
  .map(([, value]) => value)
function sanitize(text) {
  let result = String(text)
  for (const value of sensitiveValues)
    result = result.split(value).join('[redacted]')
  return result
    .replace(/https?:\/\/\S+/g, '[URL redacted]')
    .replace(/[A-Za-z0-9_.-]{80,}/g, '[token redacted]')
    .slice(0, 600)
}
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    if (startupError || vite.exitCode !== null || browser.exitCode !== null) throw new Error('Browser or Vite failed to start; ensure verification ports are unused.')
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('Local verification server did not become ready.')
}
const network = new Map()
const report = {
  firebase: null,
  appCheckTokenIssued: false,
  liveInferenceSucceeded: false,
  inferenceSource: null,
  network: [],
}
let ws
try {
  await ready('http://127.0.0.1:5176/')
  await ready('http://127.0.0.1:9226/json/list')
  const pages = await (await fetch('http://127.0.0.1:9226/json/list')).json()
  ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  let seq = 0
  const pending = new Map()
  const bodyChecks = []
  const endpoint = (raw) => {
    const url = new URL(raw)
    if (url.hostname === 'firebaseappcheck.googleapis.com')
      return 'app_check_exchange'
    if (url.hostname === 'firebasevertexai.googleapis.com')
      return 'firebase_ai_logic'
    if (
      url.hostname.endsWith('google.com') ||
      url.hostname.endsWith('gstatic.com')
    )
      return 'recaptcha_resource'
    return null
  }
  function cdp(method, params = {}) {
    const id = ++seq
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`CDP timeout: ${method}`))
      }, 15000)
      timer.unref()
      pending.set(id, { resolve, reject, timer })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }
  ws.onmessage = ({ data }) => {
    const event = JSON.parse(data)
    if (event.id && pending.has(event.id)) {
      const p = pending.get(event.id)
      pending.delete(event.id)
      clearTimeout(p.timer)
      if (event.error)
        p.reject(new Error('Browser diagnostic protocol failure.'))
      else p.resolve(event.result)
    }
    const p = event.params
    if (event.method === 'Network.requestWillBeSent') {
      const kind = endpoint(p.request.url)
      if (kind)
        network.set(p.requestId, {
          endpoint: kind,
          appCheckHeaderPresent: Object.keys(p.request.headers).some(
            (k) => k.toLowerCase() === 'x-firebase-appcheck',
          ),
        })
    }
    if (
      event.method === 'Network.requestWillBeSentExtraInfo' &&
      network.has(p.requestId)
    ) {
      const entry = network.get(p.requestId)
      entry.appCheckHeaderPresent ||= Object.keys(p.headers).some(
        (k) => k.toLowerCase() === 'x-firebase-appcheck',
      )
    }
    if (event.method === 'Network.responseReceived' && network.has(p.requestId))
      network.get(p.requestId).httpStatus = p.response.status
    if (event.method === 'Network.loadingFailed' && network.has(p.requestId))
      network.get(p.requestId).failure = /^net::[A-Z_]+$/.test(p.errorText)
        ? p.errorText
        : 'network-failure'
    if (
      event.method === 'Network.loadingFinished' &&
      network.has(p.requestId)
    ) {
      const entry = network.get(p.requestId)
      if (
        entry.httpStatus >= 400 &&
        ['app_check_exchange', 'firebase_ai_logic'].includes(entry.endpoint)
      ) {
        bodyChecks.push(
          cdp('Network.getResponseBody', { requestId: p.requestId })
            .then(({ body, base64Encoded }) => {
              const parsed = JSON.parse(
                base64Encoded ? Buffer.from(body, 'base64').toString() : body,
              )
              entry.serviceError = {
                status: parsed.error?.status,
                code: parsed.error?.code,
                message: sanitize(parsed.error?.message || ''),
                reasons: parsed.error?.details
                  ?.map((d) => d.reason)
                  .filter(Boolean),
              }
            })
            .catch(() => {
              entry.errorBodyUnavailable = true
            }),
        )
      }
    }
  }
  async function evaluate(expression) {
    const result = await cdp('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: false,
    })
    if (result.exceptionDetails)
      throw new Error('Browser script raised an exception.')
    return result.result.value
  }
  const version = await cdp('Browser.getVersion')
  report.browser = version.product
  await cdp('Network.enable')
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await cdp('Page.navigate', { url: 'http://127.0.0.1:5176/' })
  for (let i = 0; i < 100; i++) {
    if (
      await evaluate(
        "Boolean(document.querySelector('#root')?.textContent.includes('LocalLens'))",
      )
    )
      break
    await new Promise((r) => setTimeout(r, 100))
  }
  await evaluate(`void (async () => {
    const state = window.__localLensLive = { done: false, stage: 'firebase', firebase: null, appCheckTokenIssued: false };
    try {
      const firebase = await import('/src/lib/firebase.ts');
      const diagnostics = firebase.getFirebaseDiagnostics();
      state.firebase = { initialized: diagnostics.isInitialized, missingKeys: diagnostics.missingKeys, expectedProject: diagnostics.isExpectedProject, sdkVersion: diagnostics.sdkVersion };
      if (!diagnostics.isInitialized || diagnostics.missingKeys.length) throw new Error('Firebase configuration is incomplete.');
      if (globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN) throw new Error('Debug provider is forbidden for genuine attestation verification.');
      const { parseAndProfileCSV } = await import('/src/lib/profiler.ts');
      const { assessDataQuality } = await import('/src/lib/quality.ts');
      const { buildPrivacyPreservingContext } = await import('/src/lib/ai/contextBuilder.ts');
      const { generateInsights } = await import('/src/lib/ai/inference.ts');
      const csv = 'quantity,category\\n' + Array.from({ length: 20 }, (_, i) => (i + 1) + ',' + (i % 2 ? 'alpha' : 'beta')).join('\\n');
      const profile = await parseAndProfileCSV(csv, 'synthetic-demo.csv', csv.length);
      const quality = assessDataQuality(profile.rawHeaders, profile.previewRows, profile.columns, profile.fileName);
      const context = buildPrivacyPreservingContext(profile, quality);
      state.demo = { rowCount: profile.rowCount, columnCount: profile.columnCount, factCount: context.facts.length, omittedColumns: context.omittedColumns };
      const appCheck = await import('/src/lib/appCheck.ts');
      state.stage = 'app_check';
      await appCheck.verifyAppCheckToken();
      state.appCheckTokenIssued = true;
      state.stage = 'cloud_inference';
      const result = await generateInsights(context, { mode: 'only_in_cloud', cloudConsent: true, signal: AbortSignal.timeout(90000) });
      state.inferenceSource = result.inferenceSource;
      state.modelUsed = result.modelUsed;
      state.validatedReport = Boolean(result.summary && result.evidence.length);
      state.stage = 'complete';
    } catch (error) {
      state.error = { code: typeof error?.code === 'string' ? error.code : null, message: error instanceof Error ? error.message : 'Unknown failure' };
    } finally { state.done = true; }
  })()`)
  const started = Date.now()
  let state
  while (Date.now() - started < 125000) {
    state = await evaluate('window.__localLensLive')
    if (
      state?.done ||
      [...network.values()].some(
        (n) => n.failure === 'net::ERR_CERT_AUTHORITY_INVALID',
      )
    )
      break
    await new Promise((r) => setTimeout(r, 500))
  }
  report.firebase = state?.firebase || null
  report.appCheckTokenIssued = Boolean(state?.appCheckTokenIssued)
  report.stage = state?.stage
  report.demo = state?.demo
  report.inferenceSource = state?.inferenceSource || null
  report.modelUsed = state?.modelUsed
  report.liveInferenceSucceeded =
    state?.stage === 'complete' &&
    state.inferenceSource === 'in_cloud' &&
    state.validatedReport === true
  if (state?.error)
    report.error = {
      code: state.error.code,
      message: sanitize(state.error.message),
    }
  if (!state?.done)
    report.error = [...network.values()].some(
      (n) => n.failure === 'net::ERR_CERT_AUTHORITY_INVALID',
    )
      ? {
          code: 'browser-certificate-trust',
          message:
            'Browser TLS certificate verification failed. Inspect the recorded stage and request statuses; no successful inference was verified.',
        }
      : {
          code: 'verification-timeout',
          message:
            'Timed out waiting for genuine App Check/cloud verification; no success inferred.',
        }
  await Promise.allSettled(bodyChecks)
  report.network = [...network.values()]
  report.tokenBearingCloudRequestSucceeded = report.network.some(entry => entry.endpoint === 'firebase_ai_logic' && entry.httpStatus === 200 && entry.appCheckHeaderPresent)
  report.liveInferenceSucceeded &&= report.appCheckTokenIssued && report.tokenBearingCloudRequestSucceeded
  console.log(JSON.stringify(report, null, 2))
  if (!report.liveInferenceSucceeded) process.exitCode = 1
} catch (error) {
  console.error(sanitize(error.message))
  process.exitCode = 1
} finally {
  ws?.close()
  browser.kill('SIGTERM')
  vite.kill('SIGTERM')
  await new Promise((r) => setTimeout(r, 400))
  rmSync(profileDir, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 200,
  })
}
