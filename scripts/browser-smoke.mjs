// Browser UI smoke test. Uses real Chromium; does not verify real model inference.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const profileDir = mkdtempSync(join(tmpdir(), 'locallens-smoke-'))
// Keep this automated UI suite offline from Firebase even when real config is injected.
const testEnv = { ...process.env }
for (const name of Object.keys(testEnv)) {
  if (name.startsWith('VITE_FIREBASE_')) testEnv[name] = ''
}
const vite = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '5175',
    '--strictPort',
  ],
  { stdio: 'ignore', env: testEnv },
)
const browser = spawn(
  process.env.CHROMIUM_BIN || 'chromium',
  [
    '--headless',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-background-networking',
    '--remote-debugging-port=9225',
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)
let startupError
browser.on('error', (e) => {
  startupError = e
})
vite.on('error', (e) => {
  startupError = e
})
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    if (startupError) throw startupError
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* server starting */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`Server not ready: ${url}`)
}
try {
  await ready('http://127.0.0.1:5175/')
  await ready('http://127.0.0.1:9225/json/list')
  const targets = await (await fetch('http://127.0.0.1:9225/json/list')).json()
  const target = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  let seq = 0
  const pending = new Map()
  const errors = []
  const requests = []
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data)
    if (m.id) {
      const p = pending.get(m.id)
      if (p) {
        pending.delete(m.id)
        if (m.error) {
          p.reject(m.error)
        } else {
          p.resolve(m.result)
        }
      }
    }
    if (m.method === 'Runtime.exceptionThrown')
      errors.push(m.params.exceptionDetails)
    if (m.method === 'Network.requestWillBeSent')
      requests.push(m.params.request.url)
  }
  function cdp(method, params = {}) {
    const id = ++seq
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id)
          reject(new Error(`CDP timeout: ${method}`))
        }
      }, 10000).unref()
    })
  }
  async function evaluate(expression) {
    const r = await cdp('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await new Promise((r) => setTimeout(r, 100))
    }
    throw new Error('Wait failed: ' + expression)
  }
  await cdp('Runtime.enable')
  await cdp('Network.enable')
  await cdp('Page.enable')
  await cdp('Page.navigate', { url: 'http://127.0.0.1:5175/' })
  await wait('document.querySelector("#root")?.innerText.includes("LocalLens")')
  await evaluate(
    "Array.from(document.querySelectorAll('div')).find(b=>b.textContent.trim()==='Tech Employees & Compensation')?.click()",
  )
  await wait("document.body.innerText.includes('Dataset Overview')")
  await evaluate(
    "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('AI Insights')).click()",
  )
  await wait("document.body.innerText.includes('Understand your data')")
  assert.equal(
    await evaluate("document.querySelector('#ai-mode').value"),
    'only_on_device',
  )
  assert.equal(await evaluate("document.querySelector('.ai-consent')"), null)
  await evaluate(
    "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Generate AI insights')).click()",
  )
  await wait("document.querySelector('[role=alert]')")
  assert.match(
    await evaluate("document.querySelector('[role=alert]').textContent"),
    /Configure the required Firebase|Gemini Nano is unavailable/,
  )
  const nativeSupport = await evaluate(
    "(async()=>({secure:isSecureContext,api:typeof LanguageModel,availability:typeof LanguageModel==='undefined'?'absent':await Promise.race([LanguageModel.availability({expectedInputs:[{type:'text',languages:['en']}],expectedOutputs:[{type:'text',languages:['en']}]}),new Promise(r=>setTimeout(()=>r('not resolved within 3s'),3000))])}))()",
  )
  console.log('REAL_BROWSER_MODEL_AVAILABILITY', nativeSupport)
  await evaluate(
    "(()=>{const e=document.querySelector('#ai-mode');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'prefer_on_device');e.dispatchEvent(new Event('change',{bubbles:true}))})()",
  )
  await wait("document.querySelector('.ai-consent')")
  assert.equal(
    await evaluate(
      "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Generate AI insights')).disabled",
    ),
    true,
  )
  await evaluate(
    "(()=>{const e=document.querySelector('#ai-question');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'how many rows?');e.dispatchEvent(new Event('input',{bubbles:true}))})()",
  )
  await evaluate("document.querySelector('.ai-workspace form').requestSubmit()")
  await wait(
    "document.querySelector('.ai-conversation').innerText.includes('Local deterministic calculation')",
  )
  assert.equal(
    requests.filter((u) =>
      /firebaseai|firebasevertexai|generativelanguage/.test(u),
    ).length,
    0,
  )
  assert.equal(errors.length, 0)
  console.log(
    'PASS: sample data loads, AI tab renders, default is device-only, missing Firebase is handled, cloud blocked without consent, local query answered without inference network calls, no runtime exceptions.',
  )
  console.log(
    await evaluate("document.querySelector('.ai-conversation').innerText"),
  )
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source:
      "Object.defineProperty(window, 'LanguageModel', { value: undefined, configurable: true })",
  })
  await cdp('Page.navigate', { url: 'about:blank' })
  await wait("location.href === 'about:blank'")
  await cdp('Page.navigate', { url: 'http://127.0.0.1:5175/' })
  await wait("document.querySelector('#root')?.innerText.includes('LocalLens')")
  await evaluate(
    "Array.from(document.querySelectorAll('div')).find(b=>b.textContent.trim()==='Tech Employees & Compensation')?.click()",
  )
  await wait("document.body.innerText.includes('Dataset Overview')")
  await evaluate(
    "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('AI Insights')).click()",
  )
  await wait("document.querySelector('#ai-mode')")
  await evaluate(
    "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Generate AI insights')).click()",
  )
  await wait("document.querySelector('[role=alert]')")
  assert.match(
    await evaluate("document.querySelector('[role=alert]').textContent"),
    /Gemini Nano is unavailable/,
  )
  assert.equal(
    requests.filter((u) =>
      /firebaseai|firebasevertexai|generativelanguage/.test(u),
    ).length,
    0,
  )
  assert.equal(errors.length, 0)
  console.log(
    'PASS: simulated absent native API fails closed without a cloud request.',
  )
  ws.close()
} finally {
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
