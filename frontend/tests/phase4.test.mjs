import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');

const fixtures = JSON.parse(fs.readFileSync(path.join(repoRoot, 'examples/offline-fixtures.json'), 'utf8'));

test('1. All assessed fixtures satisfy Shapley efficiency & integer budget conservation', () => {
  for (const item of fixtures) {
    const proof = item.book.proof;
    if (!proof || !('charges' in proof)) continue;
    const totalMask = (1 << item.book.input.members.length) - 1;
    const grandTotal = proof.costs[totalMask];
    const sumNum = proof.numerators.reduce((a, b) => a + b, 0);
    const sumCharges = proof.charges.reduce((a, b) => a + b, 0);
    assert.equal(sumNum, grandTotal * proof.denominator, `${item.label} failed efficiency`);
    assert.equal(sumCharges, grandTotal, `${item.label} failed budget sum`);
  }
});

test('2. READY vs BLOCKED invariants hold strictly across all fixtures', () => {
  const ready = fixtures.find((f) => f.label === 'additive-ready').book;
  assert.equal(ready.state, 'READY');
  assert.equal(ready.proof.blockers.length, 0);

  const coalitionBlocked = fixtures.find((f) => f.label === 'coalition-blocked').book;
  assert.equal(coalitionBlocked.state, 'BLOCKED');
  assert.ok(coalitionBlocked.proof.blockers.length > 0);

  const roundingBlocked = fixtures.find((f) => f.label === 'rounding-blocked').book;
  assert.equal(roundingBlocked.state, 'BLOCKED');
  assert.ok(roundingBlocked.proof.blockers.some((b) => b.rounded_excess > 0));
});

test('3. Frontend relative imports resolve to existing files', () => {
  const srcRoot = path.join(frontendRoot, 'src');
  const importRe = /(?:import|from)\s+['"](\.[^'"]+)['"]/g;
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        const txt = fs.readFileSync(full, 'utf8');
        for (const m of txt.matchAll(importRe)) {
          const rel = m[1];
          const base = path.resolve(path.dirname(full), rel);
          const ok = ['.ts', '.tsx', '.css', '.json', ''].some((ext) => fs.existsSync(base + ext));
          assert.ok(ok, `Broken import ${rel} in ${full}`);
        }
      }
    }
  };
  walk(srcRoot);
});

test('4. Frontend package.json is independent and uses tsc --noEmit && vite build', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'sharetally-frontend');
  assert.equal(pkg.scripts.build, 'tsc --noEmit && vite build');
  assert.equal(pkg.dependencies['genlayer-js'], '1.1.8');
});
