import React from 'react';
import type { Book } from '../../../../sdk/types';
import { formatMajorShort, shortAddress } from '../../adapters/format';
import { RELEASE_MANIFEST, isDeployedRelease } from '../../adapters/release';
import { DemoBadge, StatusBadge } from '../StatusBadge';

export const ApprovalPanel: React.FC<{ book: Book }> = ({ book }) => {
  const deployed = isDeployedRelease(RELEASE_MANIFEST);
  const { members, currency } = book.input;
  const proof = book.proof;
  const charges = proof && 'charges' in proof ? proof.charges : null;

  const approvedSet = new Set(book.approvals.map((a) => a.toLowerCase()));
  const pendingMembers = members.filter((m) => !approvedSet.has(m.address.toLowerCase()));
  const isTerminal = book.state === 'COMMITTED' || book.state === 'CANCELLED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
            Member Consent & Final Commitment ({book.approvals.length}/{members.length} Signed)
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
            READY plans require every named wallet to approve the exact allocation digest. Final distinct approval
            transitions the book to COMMITTED.
          </p>
        </div>
        <StatusBadge state={book.state} />
      </div>

      {/* Member Approval List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {members.map((m, idx) => {
          const signed = approvedSet.has(m.address.toLowerCase());
          return (
            <div
              key={m.address}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--bg-canvas)',
              }}
            >
              <div>
                <strong>{m.name}</strong>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginLeft: '0.5rem' }}>
                  {shortAddress(m.address)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {charges && (
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {formatMajorShort(charges[idx], currency)} ({charges[idx]} minor)
                  </span>
                )}
                <span className={`badge ${signed ? 'badge-COMMITTED' : 'badge-SEALED'}`}>
                  {signed ? 'Approved' : 'Pending'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {pendingMembers.length > 0 && book.state === 'READY' && (
        <div className="notice-box">
          <strong>Awaiting Signatures From:</strong> {pendingMembers.map((m) => m.name).join(', ')}. Allocation digest:{' '}
          <span className="mono">{book.allocation_hash ?? '—'}</span>.
        </div>
      )}

      {/* Honest Undeployed Mock Adapter Notice */}
      <div className="notice-box notice-warning" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <DemoBadge label="MOCK ADAPTER · NOT DEPLOYED" />
          <strong>Live Wallet Signing Disabled</strong>
        </div>
        <span>
          Chain writes (<span className="mono">assess</span>, <span className="mono">approve</span>,{' '}
          <span className="mono">cancel</span>) are disabled while <span className="mono">deployment.json</span> has{' '}
          <span className="mono">address: null</span>. No fake wallet signature or transaction hash will be generated.
        </span>
      </div>

      {!isTerminal && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!deployed || book.state !== 'READY'}
            title="Disabled until contract is deployed and wallet is connected"
          >
            Approve Exact Allocation (Disabled — Not Deployed)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!deployed}
            title="Disabled until contract is deployed and wallet is connected"
          >
            Cancel Book (Disabled — Not Deployed)
          </button>
        </div>
      )}
    </div>
  );
};
