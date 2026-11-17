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

test('release adapter consumes root deployment manifest without a duplicate configuration', () => {
  const deployment = JSON.parse(fs.readFileSync(path.join(repoRoot, 'deployment.json'), 'utf8'));
  const releaseTs = fs.readFileSync(path.join(frontendRoot, 'src/adapters/release.ts'), 'utf8');
  assert.ok(releaseTs.includes("import manifest from '../../../deployment.json'"));
  assert.equal(deployment.chainId, 61999);
  assert.equal(deployment.sdk, 'genlayer-js@1.1.8');
  if (deployment.status === 'DEPLOYED') {
    assert.match(deployment.address, /^0x[0-9a-fA-F]{40}$/);
    assert.match(deployment.deployTransaction, /^0x[0-9a-fA-F]{64}$/);
    assert.match(deployment.sourceSha256, /^[0-9a-f]{64}$/);
  } else assert.equal(deployment.address, null);
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
