import React from 'react';
import { Link } from 'react-router-dom';
import type { Book } from '../../../../sdk/types';
import { buildAuditTrail, DEMO_TX_SCENARIOS } from '../../domain/txAdapter';
import { DemoBadge } from '../StatusBadge';

export const AuditHistoryPanel: React.FC<{
  book: Book;
  provenance: 'OFFLINE_AUTHORED' | 'OFFLINE_DEMO_DRAFT';
}> = ({ book, provenance }) => {
  const events = buildAuditTrail(book, provenance);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Audit Trail & Revision History</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
            Protocol mutations advance <span className="mono">revision</span> deterministically. Quotation & roster
            are immutable after seal.
          </p>
        </div>
        <DemoBadge label={provenance === 'OFFLINE_AUTHORED' ? 'OFFLINE / DEMO' : 'OFFLINE DRAFT'} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {events.map((ev) => (
          <div
            key={ev.id}
            style={{
              padding: '0.9rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--bg-canvas)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="member-bit-pill">Rev {ev.revision}</span>
                <strong>{ev.title}</strong>
              </div>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                {ev.actor}
              </span>
            </div>
            <p style={{ fontSize: '0.83rem', color: 'var(--ink-secondary)', marginTop: '0.35rem' }}>{ev.detail}</p>
          </div>
        ))}
      </div>

      {/* Sample Recovery Links */}
      <div className="notice-box">
        <strong>Inspect Transaction Recovery Flows (Offline Demo Scenarios):</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
          {DEMO_TX_SCENARIOS.map((sc) => (
            <Link key={sc.id} to={`/transactions/${sc.hash}`} className="btn btn-secondary btn-sm">
              {sc.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
