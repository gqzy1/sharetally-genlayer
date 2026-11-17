import React, { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { TxPhase } from '../../../sdk/types';
import { shortAddress } from '../adapters/format';
import { RELEASE_MANIFEST, isDeployedRelease } from '../adapters/release';
import { DemoBadge, UndeployedBadge } from '../components/StatusBadge';
import { DEMO_TX_SCENARIOS, loadPendingWrites, resolveTransactionView } from '../domain/txAdapter';

const LIFECYCLE_PHASES: TxPhase[] = [
  'AWAITING_SIGNATURE',
  'SUBMITTED',
  'PENDING',
  'ACCEPTED',
  'FINALIZED',
  'READING_BACK',
  'VERIFIED',
];

export const TransactionPage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const deployed = isDeployedRelease(RELEASE_MANIFEST);
  const navigate = useNavigate();
  const view = useMemo(() => resolveTransactionView(hash ?? '', loadPendingWrites()), [hash]);

  if (!view) {
    return (
      <div className="container" style={{ paddingBlock: '3.5rem' }}>
        <div className="card card-padded">
          <UndeployedBadge />
          <h1 className="editorial-title">Transaction Not Verified</h1>
          <p>No saved transaction or explicitly authored example matches <span className="mono">{hash}</span>.</p>
          <p>No receipt has been checked for this hash. Live polling is unavailable in this release.</p>
          <Link to="/books" className="btn btn-secondary">Back to Catalogue</Link>
        </div>
      </div>
    );
  }

  const localPending = view.provenance === 'LOCAL_PENDING';
  const activePending = view.pending;
  const check = view.receiptCheck;
  const activePhaseIdx = LIFECYCLE_PHASES.indexOf(view.phase);

  return (
    <div className="container" style={{ paddingBlock: '2.5rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <UndeployedBadge />
            <DemoBadge label={localPending ? 'LOCAL PENDING RECORD' : 'OFFLINE / DEMO SCENARIO'} />
          </div>
          <h1 className="editorial-title" style={{ fontSize: '2.25rem' }}>
            Transaction Recovery & Receipt Verification
          </h1>
          <p style={{ color: 'var(--ink-secondary)', maxWidth: '62ch', marginTop: '0.35rem' }}>
            Wallet signature, network <span className="mono">FINALIZED</span>, execution{' '}
            <span className="mono">SUCCESS</span>, and <span className="mono">latest-final</span> readback are
            distinct checks. Never treat a submitted hash or provisional <span className="mono">ACCEPTED</span> as final success.
          </p>
        </div>

        <Link to="/books" className="btn btn-secondary btn-sm">
          ← Back to Catalogue
        </Link>
      </div>

      {/* Scenario Switcher for Offline Inspection */}
      {!localPending && (
        <div className="demo-tabs" role="tablist" aria-label="Offline transaction recovery scenarios">
          {DEMO_TX_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              role="tab"
              aria-selected={view.demo?.id === sc.id}
              className={`demo-tab ${view.demo?.id === sc.id ? 'demo-tab-active' : ''}`}
              onClick={() => navigate(`/transactions/${sc.hash}`)}
            >
              {sc.label}
            </button>
          ))}
        </div>
      )}

      <div className="form-grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Left: Intent & Metadata */}
        <div className="card card-padded">
          <div className="section-eyebrow" style={{ marginBottom: '0.4rem' }}>
            Saved Write Intent
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem' }}>
            Method: <span className="mono">{activePending.intent.method}</span>
          </h2>
          <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', display: 'grid', gap: '0.4rem', wordBreak: 'break-all' }}>
            <div><strong>Hash:</strong> {activePending.hash}</div>
            <div><strong>Signer:</strong> {shortAddress(activePending.signer)}</div>
            <div><strong>Contract:</strong> {activePending.contract}</div>
            <div><strong>Chain:</strong> Stable Studionet ({RELEASE_MANIFEST.chainId})</div>
            <div><strong>Book ID:</strong> {activePending.bookId}</div>
            <div><strong>Submitted:</strong> {activePending.submittedAt}</div>
          </div>

          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!deployed}
              title="Live RPC polling disabled while deployment.json address is null"
            >
              Resume Finality Polling (Disabled — Not Deployed)
            </button>
          </div>
        </div>

        {/* Right: FINALIZED vs SUCCESS Matrix */}
        <div className="card card-padded">
          <div className="section-eyebrow" style={{ marginBottom: '0.4rem' }}>
            Receipt Verification Matrix
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem' }}>
            FINALIZED vs. Execution SUCCESS
          </h2>

          <div style={{ display: 'grid', gap: '0.55rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>1. Network Finality Status</span>
              <span className={`badge ${check.isFinalized ? 'badge-READY' : 'badge-REVIEW'}`}>
                {check.networkStatus}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>2. Execution Result</span>
              <span className={`badge ${check.isExecutionSuccess ? 'badge-COMMITTED' : 'badge-BLOCKED'}`}>
                {check.executionResult}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>3. Consensus Agreement</span>
              <span className={`badge ${check.isMajorityAgree ? 'badge-COMMITTED' : 'badge-REVIEW'}`}>
                {check.consensusResult}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>4. Full Consensus (leaderOnly: false)</span>
              <span className={`badge ${check.isFullConsensus ? 'badge-COMMITTED' : 'badge-BLOCKED'}`}>
                {check.isFullConsensus ? 'VERIFIED' : 'MISSING'}
              </span>
            </div>
          </div>

          <div
            className={
              check.overallOutcome === 'VERIFIED_SUCCESS'
                ? 'ready-callout'
                : check.overallOutcome === 'FINALIZED_FAILED'
                  ? 'blocker-callout'
                  : 'notice-box notice-warning'
            }
            style={{ marginTop: '1rem' }}
          >
            <strong>Outcome: {check.overallOutcome}</strong>
            <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>{check.explanation}</p>
          </div>
        </div>
      </div>

      {/* Phase Progress Rail */}
      <div className="card card-padded">
        <div className="section-eyebrow" style={{ marginBottom: '0.75rem' }}>
          Transaction Progress Stages
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {LIFECYCLE_PHASES.map((phase, idx) => {
            const reached = activePhaseIdx >= idx;
            return (
              <span
                key={phase}
                className={`badge ${reached ? 'badge-READY' : 'badge-CANCELLED'}`}
              >
                {idx + 1}. {phase}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
