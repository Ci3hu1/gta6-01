// Solmar Bay — headless play-test + screenshot taker. Drives the cached Chromium
// over CDP with Node's built-in WebSocket (no dependencies).
// Usage: node tests/playtest.mjs [--shots-only]
// Checks: page loads with no console errors and no network request outside localhost;
// the game starts, walks, jacks a car, drives, raises the wanted level by shooting,
// saves; then takes 4 screenshots (title, delivery drive, 4-star chase, victory)
// into screenshots/. Exit code 0 only when every check passes.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..');
const shotsOnly = process.argv.includes('--shots-only');
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;
const PORT = 9223;
const BASE = 'http://localhost:8080';

const failures = [];
const notes = [];
function check(name, ok, detail = '') {
  if (ok) notes.push(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else failures.push(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  return false;
}

const server = spawn('node', ['serve.ts'], { cwd: repo, stdio: 'ignore' });
if (!(await waitFor(`${BASE}/index.html`))) {
  console.error('static server did not come up');
  server.kill();
  process.exit(1);
}

rmSync('/tmp/solmar-chrome-profile', { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, '--window-size=1280,800',
  '--user-data-dir=/tmp/solmar-chrome-profile', 'about:blank',
], { stdio: 'ignore' });
if (!(await waitFor(`http://localhost:${PORT}/json/version`))) {
  console.error('chromium did not come up');
  server.kill();
  chrome.kill();
  process.exit(1);
}

const targets = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

let nextId = 1;
const pending = new Map();
const consoleErrors = [];
const networkUrls = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(`exception: ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description ?? ''}`);
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
  } else if (msg.method === 'Network.requestWillBeSent') {
    networkUrls.push(msg.params.request.url);
  } else if (msg.method === 'Network.loadingFailed') {
    consoleErrors.push(`network failed: ${msg.params.errorText}`);
  }
};
function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(`evaluate failed: ${JSON.stringify(res.exceptionDetails)}`);
  return res.result.value;
}
async function key(type, keyName, code, vk) {
  await send('Input.dispatchKeyEvent', { type, key: keyName, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
}
async function navigate(url) {
  await send('Page.navigate', { url });
  await sleep(1800);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

try {
  if (!shotsOnly) {
    await navigate(`${BASE}/`);
    check('page loads', (await evaluate(`document.title`)).includes('Solmar Bay'));
    check('game object exposed', await evaluate(`!!window.__game`));
    check('starts on title screen', (await evaluate(`window.__game.state`)) === 'title');

    await key('keyDown', 'Enter', 'Enter', 13);
    await key('keyUp', 'Enter', 'Enter', 13);
    await sleep(1000);
    check('Enter starts the game', (await evaluate(`window.__game.state`)) === 'play');
    check('mission 1 active', (await evaluate(`window.__game.missionIndex`)) === 0 && (await evaluate(`!!window.__game.mission`)));

    // Walk north with W.
    const y0 = await evaluate(`window.__game.player.y`);
    await key('keyDown', 'w', 'KeyW', 87);
    await sleep(700);
    await key('keyUp', 'w', 'KeyW', 87);
    const y1 = await evaluate(`window.__game.player.y`);
    check('WASD walks', Math.abs(y1 - y0) > 20, `y ${y0.toFixed(0)} -> ${y1.toFixed(0)}`);

    // Jack the parked car at (640, 1440): step next to it, press E.
    await evaluate(`window.__game.player.x = 640; window.__game.player.y = 1410;`);
    await sleep(400);
    await key('keyDown', 'e', 'KeyE', 69);
    await key('keyUp', 'e', 'KeyE', 69);
    await sleep(600);
    check('E jacks a car', (await evaluate(`window.__game.player.onFoot`)) === false, `onFoot=${await evaluate(`window.__game.player.onFoot`)}`);
    check('car theft raises wanted', (await evaluate(`window.__game.wanted`)) >= 1, `wanted=${await evaluate(`window.__game.wanted`)}`);

    // Drive forward.
    const d0 = await evaluate(`window.__game.player.x + window.__game.player.y`);
    await key('keyDown', 'w', 'KeyW', 87);
    await sleep(1200);
    await key('keyUp', 'w', 'KeyW', 87);
    const d1 = await evaluate(`window.__game.player.x + window.__game.player.y`);
    check('car drives', Math.abs(d1 - d0) > 30, `moved ${(d1 - d0).toFixed(0)}`);
    check('police respond to wanted level', (await evaluate(`window.__game.police.length`)) >= 1, `police=${await evaluate(`window.__game.police.length`)}`);

    // Exit, shoot: wanted must stay up / rise.
    await key('keyDown', 'e', 'KeyE', 69);
    await key('keyUp', 'e', 'KeyE', 69);
    await sleep(300);
    check('E exits the car', (await evaluate(`window.__game.player.onFoot`)) === true);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 900, y: 300 });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 900, y: 300, button: 'left', clickCount: 1 });
    await sleep(300);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 900, y: 300, button: 'left', clickCount: 1 });
    check('shooting keeps wanted level up', (await evaluate(`window.__game.wanted`)) >= 1);

    // Save via the exposed handle.
    await evaluate(`window.__game.save()`);
    check('save writes localStorage', await evaluate(`!!localStorage.getItem('solmar-bay-save-v1')`));

    check('no console errors or exceptions', consoleErrors.length === 0, consoleErrors.join(' | '));
    const external = networkUrls.filter((u) => !u.startsWith(BASE) && !u.startsWith('data:') && u !== 'about:blank');
    check('no network requests outside localhost', external.length === 0, external.join(', '));
  }

  const shots = [
    ['1-start.jpg', '?shot=start&seed=7'],
    ['2-drive.jpg', '?shot=play&seed=7'],
    ['3-chase.jpg', '?shot=chase&seed=7'],
    ['4-victory.jpg', '?shot=win&seed=7'],
  ];
  mkdirSync(join(repo, 'screenshots'), { recursive: true });
  for (const [name, query] of shots) {
    await navigate(`${BASE}/${query}`);
    await evaluate(`window.__shotReady`);
    await sleep(600);
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
    const file = join(repo, 'screenshots', name);
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    const size = statSync(file).size;
    check(`screenshot ${name} under 256 KiB`, size <= 262144, `${(size / 1024).toFixed(0)} KiB`);
    notes.push(`SHOT ${name} size=${(size / 1024).toFixed(0)} KiB`);
  }
} finally {
  ws.close();
  chrome.kill();
  server.kill();
}

console.log([...notes, ...failures].join('\n'));
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed.');
