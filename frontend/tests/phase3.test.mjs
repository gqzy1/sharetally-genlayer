import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');

function loadTxAdapter() {
  let code = fs.readFileSync(path.join(frontendRoot, 'src/domain/txAdapter.ts'), 'utf8');
  const fnNames = [
    ...code.matchAll(/^export\s+(?:function|const)\s+([A-Za-z0-9_]+)/gm),
  ].map((m) => m[1]);

  code = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/^export\s+/gm, '');

  const exports = {};
  const sandbox = {
    Map, Set, Array, Object, Number, String, Boolean, JSON, Date, RegExp, Math,
    exports,
  };
  const script = new vm.Script(`${code}\nObject.assign(exports, { ${fnNames.join(', ')} });`);
  script.runInNewContext(sandbox);
  return sandbox.exports;
}

const txAdapter = loadTxAdapter();
const fixtures = JSON.parse(fs.readFileSync(path.join(repoRoot, 'examples/offline-fixtures.json'), 'utf8'));
const readyBook = fixtures.find((f) => f.label === 'additive-ready').book;
const blockedBook = fixtures.find((f) => f.label === 'coalition-blocked').book;
const nonmonoBook = fixtures.find((f) => f.label === 'nonmonotone-blocked').book;

test('1. Shapley allocation efficiency & rounding invariants hold on fixtures', () => {
  const p = readyBook.proof;
  const totalMask = (1 << readyBook.input.members.length) - 1;
  const sumNumerators = p.numerators.reduce((a, b) => a + b, 0);
  const sumCharges = p.charges.reduce((a, b) => a + b, 0);
  assert.equal(sumNumerators, p.costs[totalMask] * p.denominator);
  assert.equal(sumCharges, p.costs[totalMask]);
});

test('2. Exit inspection permits READY subgroup and flags BLOCKED coalition with exact excess', () => {
  const safeExit = txAdapter.inspectExitCoalition(readyBook, 3); // Ada + Bo
  assert.equal(safeExit.isBlocking, false);
  assert.equal(safeExit.roundedExcess, 0);
  assert.equal(safeExit.exactExcessNumerator, 0);

  const blockedExit = txAdapter.inspectExitCoalition(blockedBook, 3); // Ada + Bo
  assert.equal(blockedExit.isBlocking, true);
  assert.equal(blockedExit.leavingStandaloneCost, 1);
  assert.equal(blockedExit.assignedRoundedSum, 2);
  assert.equal(blockedExit.roundedExcess, 1);
  assert.equal(blockedExit.exactExcessNumerator, 6);

  const nonmonoExit = txAdapter.inspectExitCoalition(nonmonoBook, 1);
  assert.equal(nonmonoExit.isBlocking, true);
  assert.ok(nonmonoExit.verdictTitle.includes('Nonmonotone'));
});

test('3. Audit trail records creation, quote lock, assessment, exit check, approvals, and cancel', () => {
  const simulatedApproved = {
    ...readyBook,
    approvals: [readyBook.input.members[0].address],
    state: 'CANCELLED',
    cancelled_by: readyBook.input.members[1].address,
    revision: 3,
  };
  const trail = txAdapter.buildAuditTrail(simulatedApproved, 'OFFLINE_AUTHORED');
  const kinds = trail.map((e) => e.kind);
  assert.ok(kinds.includes('CREATE'));
  assert.ok(kinds.includes('QUOTE_LOCK'));
  assert.ok(kinds.includes('ASSESS'));
  assert.ok(kinds.includes('EXIT_CHECK'));
  assert.ok(kinds.includes('APPROVAL'));
  assert.ok(kinds.includes('CANCEL'));
});

test('4. Transaction envelope strictly distinguishes FINALIZED from execution SUCCESS', () => {
  const ok = txAdapter.evaluateTxEnvelope({
    statusName: 'FINALIZED',
    txExecutionResultName: 'FINISHED_WITH_RETURN',
    resultName: 'MAJORITY_AGREE',
    leaderOnly: false,
    verifiedReadback: true,
  });
  assert.equal(ok.overallOutcome, 'VERIFIED_SUCCESS');

  const finalizedFailed = txAdapter.evaluateTxEnvelope({
    statusName: 'FINALIZED',
    txExecutionResultName: 'ERROR',
    resultName: 'MAJORITY_AGREE',
    leaderOnly: false,
  });
  assert.equal(finalizedFailed.isFinalized, true);
  assert.equal(finalizedFailed.isExecutionSuccess, false);
  assert.equal(finalizedFailed.overallOutcome, 'FINALIZED_FAILED');

  const acceptedProvisional = txAdapter.evaluateTxEnvelope({
    statusName: 'ACCEPTED',
  });
  assert.equal(acceptedProvisional.overallOutcome, 'PROVISIONAL');

  const timedOut = txAdapter.evaluateTxEnvelope({
    statusName: 'ACCEPTED',
    timedOut: true,
  });
  assert.equal(timedOut.overallOutcome, 'TIMEOUT_UNVERIFIED');
});

test('saved pending transactions never inherit an authored success receipt', () => {
  const pending = { ...txAdapter.DEMO_TX_SCENARIOS[0].pending };
  const view = txAdapter.resolveTransactionView(pending.hash, [pending]);
  assert.equal(view.provenance, 'LOCAL_PENDING');
  assert.equal(view.demo, null);
  assert.equal(view.phase, 'PENDING');
  assert.equal(view.receiptCheck.isFinalized, false);
  assert.equal(view.receiptCheck.isExecutionSuccess, false);
  assert.equal(view.receiptCheck.overallOutcome, 'PENDING');
});

test('unknown transaction hashes never fall back to an offline example', () => {
  assert.equal(txAdapter.resolveTransactionView('0x' + 'd'.repeat(64), []), null);
});

test('explicit demo routes retain their own outcomes and selected identities', () => {
  const first = txAdapter.resolveTransactionView('demo', []);
  const failed = txAdapter.resolveTransactionView(txAdapter.DEMO_TX_SCENARIOS[1].hash, []);
  assert.equal(first.provenance, 'OFFLINE_DEMO');
  assert.equal(failed.demo.id, 'demo-finalized-failed');
  assert.equal(failed.receiptCheck.overallOutcome, 'FINALIZED_FAILED');
  assert.equal(failed.pending.hash, txAdapter.DEMO_TX_SCENARIOS[1].hash);
});
