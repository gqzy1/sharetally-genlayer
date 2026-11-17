import React from 'react';
import type { Book } from '../../../../sdk/types';
import { formatExactFraction, formatMajorShort, formatMinorUnits, shortAddress } from '../../adapters/format';

export const ShapleyBreakdown: React.FC<{ book: Book }> = ({ book }) => {
  const { members, currency } = book.input;
  const proof = book.proof;
  const rows = book.accepted?.rows ?? [];

  if (!proof) {
    return (
      <div className="notice-box">
        <strong>No Shapley Proof Yet:</strong> Assessment has not run on this {book.state} book.
      </div>
    );
  }

  if ('unresolved' in proof) {
    return (
      <div className="notice-box notice-warning">
        <strong>State REVIEW:</strong> Unresolved coalition mask(s) <span className="mono">{proof.unresolved.join(', ')}</span>{' '}
        have UNKNOWN pricing terms. No Shapley split can be computed.
      </div>
    );
  }

  if ('nonmonotone' in proof) {
    return (
      <div className="blocker-callout">
        <strong>Blocked Before Shapley Calculation (Nonmonotone Schedule)</strong>
        <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
          Adding a member decreased the standalone price by{' '}
          <span className="mono">{proof.nonmonotone[0]?.decrease}</span> minor units. ShareTally excludes
          nonmonotone schedules rather than creating negative charges.
        </p>
      </div>
    );
  }

  const grandMask = (1 << members.length) - 1;
  const grandTotal = proof.costs[grandMask] ?? 0;
  const equalShareApprox = grandTotal / members.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
          Exact Shapley Allocation & Minor-Unit Rounding
        </h3>
        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
          Grand Total: {formatMinorUnits(grandTotal, currency)} · Denominator n! = {proof.denominator}
        </span>
      </div>

      {/* Member Cards with Visual Comparison Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {members.map((m, idx) => {
          const standaloneRow = rows.find((r) => r.mask === 1 << idx);
          const standalone = standaloneRow?.status === 'KNOWN' ? standaloneRow.cost : 0;
          const numerator = proof.numerators[idx];
          const charge = proof.charges[idx];
          const sharePct = grandTotal > 0 ? ((charge / grandTotal) * 100).toFixed(1) : '0.0';
          const tieRank = proof.rounding_order.indexOf(idx) + 1;
          const maxRef = Math.max(grandTotal, standalone, 1);

          return (
            <div
              key={m.address}
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--bg-canvas)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1rem' }}>{m.name}</strong>
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                      {shortAddress(m.address)}
                    </span>
                    <span className="member-bit-pill">Rounding Priority #{tieRank}</span>
                  </div>
                  <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', marginTop: '0.3rem' }}>
                    Exact Shapley: {numerator}/{proof.denominator} ({formatExactFraction(numerator, proof.denominator)}) minor · Share: {sharePct}%
                  </div>
                </div>

                <div className="mono" style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{formatMajorShort(charge, currency)}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{charge} minor units</div>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
                  <span>Assigned Shapley Charge ({charge} minor)</span>
                  <span>Standalone ({standalone} minor) · Equal ref ({equalShareApprox.toFixed(1)})</span>
                </div>
                <div className="bar-track" title={`Assigned Shapley Charge: ${charge}`}>
                  <div className="bar-fill-shapley" style={{ width: `${Math.min(100, Math.round((charge / maxRef) * 100))}%` }} />
                </div>
                <div className="bar-track" title={`Standalone Cost: ${standalone}`}>
                  <div className="bar-fill-standalone" style={{ width: `${Math.min(100, Math.round((standalone / maxRef) * 100))}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Exact Formula & Invariants */}
      <div className="notice-box">
        <strong>Protocol Arithmetic & Invariants:</strong> Exact numerator{' '}
        <span className="mono">aᵢ = Σ |S|!(n−|S|−1)!(C(S∪{'{i}'}) − C(S))</span> over all{' '}
        <span className="mono">S ∌ i</span>. Efficiency sum{' '}
        <span className="mono">Σ aᵢ = {proof.numerators.reduce((a, b) => a + b, 0)} = {proof.denominator} × {grandTotal}</span>.
        Integer charges sum to <span className="mono">{proof.charges.reduce((a, b) => a + b, 0)}</span> minor units via
        largest-remainder rounding (ties broken by lower roster index).
      </div>
    </div>
  );
};
