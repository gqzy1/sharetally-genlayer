import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');

test('all six required routes are configured in App.tsx', () => {
  const appSource = fs.readFileSync(path.join(frontendRoot, 'src/app/App.tsx'), 'utf8');
  for (const route of ['"/"', '"/books/new"', '"/books"', '"/books/:owner/:tag"', '"/examples"', '"/transactions/:hash"']) {
    assert.ok(appSource.includes(route), `Missing route ${route}`);
  }
});

test('release adapter matches root deployment.json undeployed state', () => {
  const deployment = JSON.parse(fs.readFileSync(path.join(repoRoot, 'deployment.json'), 'utf8'));
  const releaseTs = fs.readFileSync(path.join(frontendRoot, 'src/adapters/release.ts'), 'utf8');
  assert.equal(deployment.status, 'NOT_DEPLOYED');
  assert.equal(deployment.address, null);
  assert.ok(releaseTs.includes(`chainId: ${deployment.chainId}`));
  assert.ok(releaseTs.includes(deployment.sourceSha256));
  assert.ok(releaseTs.includes("status: 'NOT_DEPLOYED'"));
});

test('offline fixtures carry OFFLINE_AUTHORED provenance without fake chain hashes', () => {
  const fixtures = JSON.parse(fs.readFileSync(path.join(repoRoot, 'examples/offline-fixtures.json'), 'utf8'));
  assert.ok(Array.isArray(fixtures) && fixtures.length >= 4);
  for (const item of fixtures) {
    assert.equal(item.provenance, 'OFFLINE_AUTHORED');
    assert.equal(item.txHash, undefined);
    assert.equal(item.receipt, undefined);
  }
});
