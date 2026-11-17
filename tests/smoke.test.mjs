// Solmar Bay — smoke test (node:test, stdlib only). Run before every submit:
// `node --test tests/smoke.test.mjs`.
// Verifies the handoff program runs, the dossier is written, the game loads nothing
// over the network, and the screenshots meet the gate's shape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

test('main.ts writes a dossier for game/ + screenshots/', () => {
  const out = mkdtempSync(join(tmpdir(), 'solmar-bay-out-'));
  execFileSync('node', ['main.ts'], { cwd: repo, env: { ...process.env, MAKEFUN_OUTPUT_DIR: out } });
  assert.ok(existsSync(join(out, 'game', 'index.html')), 'game/index.html copied');
  assert.ok(existsSync(join(out, 'dossier.json')), 'dossier.json written');
  const dossier = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
  assert.equal(dossier.schema, 'makefun/dossier/v1');
  assert.ok(dossier.text.length > 1000, 'dossier carries real source text');
  assert.ok(dossier.images.length >= 3, 'dossier carries the screenshots');
});

test('game/ loads nothing over the network', () => {
  const files = walk(join(repo, 'game'));
  assert.ok(files.length > 0, 'game/ is not empty');
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!/https?:\/\//.test(text), `${file} names an http(s) URL`);
    assert.ok(!/["']\/\//.test(text), `${file} names a protocol-relative URL`);
  }
});

test('game/ source files are one job each and cover the brief', () => {
  const src = readdirSync(join(repo, 'game', 'src'));
  for (const needed of ['config.js', 'input.js', 'random.js', 'world.js', 'entities.js', 'missions.js', 'combat.js', 'audio.js', 'render.js', 'shots.js', 'main.js']) {
    assert.ok(src.includes(needed), `game/src/${needed} missing`);
  }
  const missions = readFileSync(join(repo, 'game', 'src', 'missions.js'), 'utf8');
  assert.equal((missions.match(/title: '/g) || []).length, 12, '12 missions in the story');
});

test('screenshots meet the gate shape', () => {
  const shots = readdirSync(join(repo, 'screenshots')).filter((n) => !n.startsWith('.'));
  assert.ok(shots.length >= 3 && shots.length <= 4, `3-4 screenshots, got ${shots.length}`);
  for (const name of shots) {
    const file = join(repo, 'screenshots', name);
    const size = statSync(file).size;
    assert.ok(size <= 262144, `${name} is ${size} bytes, over the 256 KiB cap`);
    const head = readFileSync(file).subarray(0, 3);
    const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e;
    assert.ok(isJpeg || isPng, `${name} is not a JPEG or PNG`);
    assert.match(name, /^[A-Za-z0-9._-]+$/, `${name} has a disallowed name`);
  }
});

test('STRATEGY.md is non-blank and the repo has a license', () => {
  const strategy = readFileSync(join(repo, 'STRATEGY.md'), 'utf8').trim();
  assert.ok(strategy.length > 200, 'STRATEGY.md is substantive');
  assert.ok(existsSync(join(repo, 'LICENSE')), 'LICENSE present');
  assert.ok(existsSync(join(repo, 'main.ts')), 'main.ts present');
  assert.ok(existsSync(join(repo, 'vendor', 'makefun-game.ts')), 'vendor/makefun-game.ts present');
});
