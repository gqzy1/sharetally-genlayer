import type { Book, PendingWrite, TxHash, TxPhase } from '../../../sdk/types';

export interface ExitInspectionResult {
  mask: number;
  leavingNames: string[];
  remainingMask: number;
  remainingNames: string[];
  grandTotalCost: number;
  leavingStandaloneCost: number | null;
  remainingStandaloneCost: number | null;
  assignedRoundedSum: number;
  assignedExactNumerator: number;
  denominator: number;
  exactExcessNumerator: number;
  roundedExcess: number;
  isBlocking: boolean;
  verdictTitle: string;
  verdictDetail: string;
}

export interface AuditEvent {
  id: string;
  revision: number;
  kind: 'CREATE' | 'QUOTE_LOCK' | 'ASSESS' | 'EXIT_CHECK' | 'APPROVAL' | 'CANCEL' | 'TX';
  title: string;
  detail: string;
  actor: string;
  provenance: 'OFFLINE_AUTHORED' | 'OFFLINE_DEMO_DRAFT';
}

export interface ReceiptCheckSummary {
  networkStatus: string;
  isFinalized: boolean;
  executionResult: string;
  isExecutionSuccess: boolean;
  consensusResult: string;
  isMajorityAgree: boolean;
  isFullConsensus: boolean;
  overallOutcome: 'VERIFIED_SUCCESS' | 'FINALIZED_FAILED' | 'PROVISIONAL' | 'PENDING' | 'TIMEOUT_UNVERIFIED';
  explanation: string;
}

export interface DemoTransactionScenario {
  id: string;
  label: string;
  hash: TxHash;
  phase: TxPhase;
  pending: PendingWrite;
  receiptCheck: ReceiptCheckSummary;
}

const PENDING_TXS_KEY = 'sharetally.pending_txs.v1';

export function inspectExitCoalition(book: Book, mask: number): ExitInspectionResult | null {
  const members = book.input.members;
  const n = members.length;
  const grandMask = (1 << n) - 1;
  if (mask <= 0 || mask >= grandMask) return null;

  const rows = book.accepted?.rows ?? [];
  const proof = book.proof;
  const leavingNames = members.filter((_, i) => (mask & (1 << i)) !== 0).map((m) => m.name);
  const remainingMask = grandMask ^ mask;
  const remainingNames = members.filter((_, i) => (remainingMask & (1 << i)) !== 0).map((m) => m.name);

  const grandRow = rows.find((r) => r.mask === grandMask);
  const leavingRow = rows.find((r) => r.mask === mask);
  const remainingRow = rows.find((r) => r.mask === remainingMask);

  const grandTotalCost = grandRow?.status === 'KNOWN' ? grandRow.cost : 0;
  const leavingStandaloneCost = leavingRow?.status === 'KNOWN' ? leavingRow.cost : null;
  const remainingStandaloneCost = remainingRow?.status === 'KNOWN' ? remainingRow.cost : null;

  if (!proof || !('charges' in proof)) {
    return {
      mask,
      leavingNames,
      remainingMask,
      remainingNames,
      grandTotalCost,
      leavingStandaloneCost,
      remainingStandaloneCost,
      assignedRoundedSum: 0,
      assignedExactNumerator: 0,
      denominator: 1,
      exactExcessNumerator: 0,
      roundedExcess: 0,
      isBlocking: true,
      verdictTitle:
        proof?.status === 'REVIEW'
          ? 'Cannot Verify Exit — Unknown Coalition Terms'
          : 'Blocked Before Split — Nonmonotone Schedule',
      verdictDetail:
        proof?.status === 'REVIEW'
          ? 'At least one coalition has UNKNOWN cost, so no Shapley allocation exists to test.'
          : 'Adding a member lowered the total price; the protocol blocks nonmonotone schedules before computing shares.',
    };
  }

  const assignedRoundedSum = members.reduce((acc, _, i) => ((mask & (1 << i)) !== 0 ? acc + proof.charges[i] : acc), 0);
  const assignedExactNumerator = members.reduce(
    (acc, _, i) => ((mask & (1 << i)) !== 0 ? acc + proof.numerators[i] : acc),
    0,
  );
  const standalone = leavingStandaloneCost ?? 0;
  const exactExcessNumerator = Math.max(0, assignedExactNumerator - standalone * proof.denominator);
  const roundedExcess = Math.max(0, assignedRoundedSum - standalone);
  const isBlocking = exactExcessNumerator > 0 || roundedExcess > 0;

  return {
    mask,
    leavingNames,
    remainingMask,
    remainingNames,
    grandTotalCost,
    leavingStandaloneCost,
    remainingStandaloneCost,
    assignedRoundedSum,
    assignedExactNumerator,
    denominator: proof.denominator,
    exactExcessNumerator,
    roundedExcess,
    isBlocking,
    verdictTitle: isBlocking ? 'Exit Objection — Blocking Coalition' : 'No Exit Incentive — Core Safe',
    verdictDetail: isBlocking
      ? `${leavingNames.join(' + ')} would pay ${assignedRoundedSum} minor units (${assignedExactNumerator}/${proof.denominator} exact) inside the group, which exceeds their standalone cost of ${standalone} minor units.`
      : `${leavingNames.join(' + ')} pays ${assignedRoundedSum} minor units (${assignedExactNumerator}/${proof.denominator} exact), which does not exceed their standalone cost of ${standalone} minor units.`,
  };
}

export function buildAuditTrail(
  book: Book,
  provenance: 'OFFLINE_AUTHORED' | 'OFFLINE_DEMO_DRAFT',
): AuditEvent[] {
  const events: AuditEvent[] = [
    {
      id: `${book.id}-rev-0`,
      revision: 0,
      kind: 'CREATE',
      title: 'Book Sealed (Immutable Specification)',
      detail: `Created "${book.input.title}" in ${book.input.currency} with ${book.input.members.length} named wallets (${book.input.members.map((m) => m.name).join(' → ')}).`,
      actor: book.owner,
      provenance,
    },
    {
      id: `${book.id}-quote-lock`,
      revision: 0,
      kind: 'QUOTE_LOCK',
      title: 'Quotation & Member Roster Locked',
      detail: `Input hash ${book.input_hash}. Contract forbids in-place quote or roster edits; corrections require sealing a new book.`,
      actor: 'Protocol Rule',
      provenance,
    },
  ];

  if (book.accepted && book.proof) {
    events.push({
      id: `${book.id}-rev-1-assess`,
      revision: 1,
      kind: 'ASSESS',
      title: `Assessment Completed → ${book.proof.status}`,
      detail: `Evaluated ${book.accepted.rows.length} nonempty coalitions. Allocation digest: ${book.allocation_hash ?? 'none'}.`,
      actor: 'GenLayer Consensus (Offline Fixture)',
      provenance,
    });

    if ('blockers' in book.proof) {
      events.push({
        id: `${book.id}-rev-1-exit`,
        revision: 1,
        kind: 'EXIT_CHECK',
        title:
          book.proof.blockers.length === 0
            ? 'Coalition Exit Check Passed (0 Blockers)'
            : `Coalition Exit Check Failed (${book.proof.blockers.length} Blocker${book.proof.blockers.length > 1 ? 's' : ''})`,
        detail:
          book.proof.blockers.length === 0
            ? 'Every proper nonempty subgroup satisfies both exact rational and rounded core bounds.'
            : `Detected blocking coalition(s) where assigned share exceeds standalone cost.`,
        actor: 'Deterministic Contract',
        provenance,
      });
    } else if ('nonmonotone' in book.proof) {
      events.push({
        id: `${book.id}-rev-1-nonmono`,
        revision: 1,
        kind: 'EXIT_CHECK',
        title: 'Monotonicity Check Failed',
        detail: `${book.proof.nonmonotone.length} superset price decrease(s) detected; split halted.`,
        actor: 'Deterministic Contract',
        provenance,
      });
    }
  }

  book.approvals.forEach((addr, idx) => {
    const member = book.input.members.find((m) => m.address.toLowerCase() === addr.toLowerCase());
    events.push({
      id: `${book.id}-approval-${idx}`,
      revision: 2 + idx,
      kind: 'APPROVAL',
      title: `Member Approved (${member?.name ?? addr})`,
      detail: `Signed allocation digest ${book.allocation_hash ?? '—'} (${idx + 1}/${book.input.members.length}).`,
      actor: addr,
      provenance,
    });
  });

  if (book.state === 'CANCELLED') {
    events.push({
      id: `${book.id}-cancelled`,
      revision: book.revision,
      kind: 'CANCEL',
      title: 'Book Cancelled (Terminal)',
      detail: `Cancelled by ${book.cancelled_by ?? 'named member'}. Historical findings remain inspectable.`,
      actor: book.cancelled_by ?? 'Member',
      provenance,
    });
  }

  return events;
}

export function evaluateTxEnvelope(raw: {
  statusName?: string;
  txExecutionResultName?: string;
  resultName?: string;
  leaderOnly?: boolean;
  timedOut?: boolean;
  verifiedReadback?: boolean;
}): ReceiptCheckSummary {
  if (raw.timedOut) {
    return {
      networkStatus: raw.statusName ?? 'PENDING',
      isFinalized: false,
      executionResult: 'UNVERIFIED',
      isExecutionSuccess: false,
      consensusResult: 'UNVERIFIED',
      isMajorityAgree: false,
      isFullConsensus: false,
      overallOutcome: 'TIMEOUT_UNVERIFIED',
      explanation: 'WAIT_TIMEOUT means unverified, NOT failed. Retain this exact hash and resume polling without resubmitting.',
    };
  }

  const networkStatus = raw.statusName ?? 'PENDING';
  const isFinalized = networkStatus === 'FINALIZED';
  const executionResult = raw.txExecutionResultName ?? 'PENDING';
  const isExecutionSuccess = executionResult === 'FINISHED_WITH_RETURN';
  const consensusResult = raw.resultName ?? 'PENDING';
  const isMajorityAgree = consensusResult === 'MAJORITY_AGREE';
  const isFullConsensus = raw.leaderOnly === false;

  if (!isFinalized) {
    return {
      networkStatus,
      isFinalized: false,
      executionResult,
      isExecutionSuccess: false,
      consensusResult,
      isMajorityAgree: false,
      isFullConsensus: false,
      overallOutcome: networkStatus === 'ACCEPTED' ? 'PROVISIONAL' : 'PENDING',
      explanation:
        networkStatus === 'ACCEPTED'
          ? 'ACCEPTED is provisional only. Wait for FINALIZED, execution success, and latest-final readback.'
          : 'Transaction is still progressing through consensus stages.',
    };
  }

  if (!isExecutionSuccess || !isMajorityAgree || !isFullConsensus) {
    return {
      networkStatus,
      isFinalized: true,
      executionResult,
      isExecutionSuccess,
      consensusResult,
      isMajorityAgree,
      isFullConsensus,
      overallOutcome: 'FINALIZED_FAILED',
      explanation:
        'FINALIZED does NOT mean SUCCESS: the transaction reached finality, but execution or majority consensus failed. Book state remains unchanged.',
    };
  }

  return {
    networkStatus,
    isFinalized: true,
    executionResult,
    isExecutionSuccess: true,
    consensusResult,
    isMajorityAgree: true,
    isFullConsensus: true,
    overallOutcome: raw.verifiedReadback ? 'VERIFIED_SUCCESS' : 'PROVISIONAL',
    explanation: raw.verifiedReadback
      ? 'FINALIZED + FINISHED_WITH_RETURN + MAJORITY_AGREE + latest-final readback verified.'
      : 'Finalized execution succeeded; awaiting latest-final readback verification.',
  };
}

export const DEMO_TX_SCENARIOS: DemoTransactionScenario[] = [
  {
    id: 'demo-verified',
    label: 'Finalized + Execution Success + Verified',
    hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    phase: 'VERIFIED',
    pending: {
      hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      signer: '0x1111111111111111111111111111111111111111',
      contract: '0x0000000000000000000000000000000000000000',
      bookId: '0x1111111111111111111111111111111111111111:additive-ready',
      intent: { method: 'assess', bookId: '0x1111111111111111111111111111111111111111:additive-ready', revision: 0 },
      submittedAt: '2026-11-18T00:00:00.000Z',
    },
    receiptCheck: evaluateTxEnvelope({
      statusName: 'FINALIZED',
      txExecutionResultName: 'FINISHED_WITH_RETURN',
      resultName: 'MAJORITY_AGREE',
      leaderOnly: false,
      verifiedReadback: true,
    }),
  },
  {
    id: 'demo-finalized-failed',
    label: 'Finalized but Execution Failed (TX_FAILED)',
    hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    phase: 'FINALIZED',
    pending: {
      hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      signer: '0x1111111111111111111111111111111111111111',
      contract: '0x0000000000000000000000000000000000000000',
      bookId: '0x1111111111111111111111111111111111111111:additive-ready',
      intent: { method: 'approve', bookId: '0x1111111111111111111111111111111111111111:additive-ready', revision: 1, allocationHash: '520a4d49...' },
      submittedAt: '2026-11-18T00:05:00.000Z',
    },
    receiptCheck: evaluateTxEnvelope({
      statusName: 'FINALIZED',
      txExecutionResultName: 'ERROR',
      resultName: 'MAJORITY_AGREE',
      leaderOnly: false,
    }),
  },
  {
    id: 'demo-timeout',
    label: 'Polling Timeout (Unverified — Do Not Resubmit)',
    hash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    phase: 'ACCEPTED',
    pending: {
      hash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      signer: '0x2222222222222222222222222222222222222222',
      contract: '0x0000000000000000000000000000000000000000',
      bookId: '0x1111111111111111111111111111111111111111:additive-ready',
      intent: { method: 'assess', bookId: '0x1111111111111111111111111111111111111111:additive-ready', revision: 0 },
      submittedAt: '2026-11-18T00:10:00.000Z',
    },
    receiptCheck: evaluateTxEnvelope({
      statusName: 'ACCEPTED',
      timedOut: true,
    }),
  },
];

export function loadPendingWrites(
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): PendingWrite[] {
  if (!storage) return [];
  const raw = storage.getItem(PENDING_TXS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingWrite[]) : [];
  } catch {
    return [];
  }
}

export interface TransactionView {
  pending: PendingWrite;
  receiptCheck: ReceiptCheckSummary;
  phase: TxPhase;
  demo: DemoTransactionScenario | null;
  provenance: 'LOCAL_PENDING' | 'OFFLINE_DEMO';
}

export function resolveTransactionView(hash: string, pendingWrites: PendingWrite[]): TransactionView | null {
  const requested = hash.toLowerCase();
  const pending = pendingWrites.find((p) => p.hash.toLowerCase() === requested);
  if (pending) {
    return {
      pending,
      receiptCheck: evaluateTxEnvelope({ statusName: 'PENDING' }),
      phase: 'PENDING',
      demo: null,
      provenance: 'LOCAL_PENDING',
    };
  }
  const demo = hash === 'demo'
    ? DEMO_TX_SCENARIOS[0]
    : DEMO_TX_SCENARIOS.find((d) => d.hash.toLowerCase() === requested || d.id === hash);
  if (!demo) return null;
  return { pending: demo.pending, receiptCheck: demo.receiptCheck, phase: demo.phase, demo, provenance: 'OFFLINE_DEMO' };
}
