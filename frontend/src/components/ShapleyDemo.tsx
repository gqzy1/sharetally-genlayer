import React, { useState } from 'react';
import { OFFLINE_FIXTURES } from '../fixtures/offlineFixtures';
import {
  formatExactFraction,
  formatMajorShort,
  formatMinorUnits,
  maskToMemberNames,
} from '../adapters/format';
import { DemoBadge, StatusBadge } from './StatusBadge';

const SCENARIO_META: Record<string, { title: string; subtitle: string }> = {
  'additive-ready': {
    title: 'Shared Print Setup',
    subtitle: 'Group fee 120 + 30/member · Core-safe Shapley split',
  },
  'coalition-blocked': {
    title: 'Coalition Exit Objection',
    subtitle: 'Cheaper grand total, yet subgroup {Ada, Bo} overpays',
  },
  'rounding-blocked': {
    title: 'Rounding-Only Blocker',
    subtitle: 'Exact shares are safe; integer rounding triggers exit excess',
  },
  'nonmonotone-blocked': {
    title: 'Nonmonotone Price Drop',
    subtitle: 'Adding a member lowers total cost; blocked before split',
  },
};

export const ShapleyDemo: React.FC = () => {
  const [activeLabel, setActiveLabel] = useState<string>(OFFLINE_FIXTURES[0]?.label ?? 'additive-ready');
  const fixture = OFFLINE_FIXTURES.find((f) => f.label === activeLabel) ?? OFFLINE_FIXTURES[0];

  if (!fixture) return null;

  const { book } = fixture;
  const { members, currency } = book.input;
  const rows = book.accepted?.rows ?? [];
  const proof = book.proof;
  const grandMask = (1 << members.length) - 1;
  const grandRow = rows.find((r) => r.mask === grandMask);
  const grandTotal = grandRow?.status === 'KNOWN' ? grandRow.cost : 0;

  return (
    <div>
      <div className="demo-tabs" role="tablist" aria-label="Offline Shapley scenarios">
        {OFFLINE_FIXTURES.map((item) => {
          const meta = SCENARIO_META[item.label] ?? { title: item.label, subtitle: '' };
          const isActive = item.label === fixture.label;
          return (
            <button
              key={item.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`demo-tab ${isActive ? 'demo-tab-active' : ''}`}
              onClick={() => setActiveLabel(item.label)}
            >
              <span>{meta.title}</span>
              <StatusBadge state={item.book.state} />
            </button>
          );
        })}
      </div>

      <div className="card card-padded">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            flexWrap: 'wrap',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border-hairline)',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <DemoBadge label="OFFLINE / DEMO · OFFLINE_AUTHORED" />
              <StatusBadge state={book.state} />
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                {book.input.currency} · 100 minor units = 1.00 {book.input.currency}
              </span>
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{book.input.title}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', marginTop: '0.25rem' }}>
              {SCENARIO_META[fixture.label]?.subtitle}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="section-eyebrow">Grand Coalition Total</div>
            <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.2rem' }}>
              {formatMajorShort(grandTotal, currency)}
            </div>
            <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
              {grandTotal} minor units ({members.length} members)
            </div>
          </div>
        </div>

        <div className="demo-grid">
          {/* Left: Coalition Cost Matrix */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                1. Coalition Cost Table ({rows.length} nonempty subsets)
              </h4>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                C(∅) = 0 by protocol
              </span>
            </div>

            <div className="table-wrap">
              <table className="data-table mobile-card-table">
                <thead>
                  <tr>
                    <th>Mask</th>
                    <th>Coalition</th>
                    <th>Standalone</th>
                    <th>Quote Excerpt</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const names = maskToMemberNames(row.mask, members);
                    return (
                      <tr key={row.mask}>
                        <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                          #{row.mask}
                        </td>
                        <td style={{ fontWeight: 600 }}>{names.join(' + ')}</td>
                        <td className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {row.status === 'KNOWN' ? formatMinorUnits(row.cost, currency) : 'UNKNOWN'}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>
                          {row.quote || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Shapley Allocation & Exit Check */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                2. Exact Shapley Split & Rounding
              </h4>

              {proof && 'charges' in proof ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {members.map((member, idx) => {
                    const standaloneRow = rows.find((r) => r.mask === 1 << idx);
                    const standaloneCost = standaloneRow?.status === 'KNOWN' ? standaloneRow.cost : 0;
                    const charge = proof.charges[idx];
                    const num = proof.numerators[idx];
                    const den = proof.denominator;
                    const maxVal = Math.max(grandTotal, standaloneCost, 1);
                    const chargePct = Math.min(100, Math.round((charge / maxVal) * 100));
                    const standalonePct = Math.min(100, Math.round((standaloneCost / maxVal) * 100));

                    return (
                      <div
                        key={member.address}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-hairline)',
                          background: 'var(--bg-canvas)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                          <div>
                            <strong>{member.name}</strong>
                            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginLeft: '0.5rem' }}>
                              Tie #{proof.rounding_order.indexOf(idx) + 1}
                            </span>
                          </div>
                          <div className="mono" style={{ textAlign: 'right' }}>
                            <strong style={{ fontSize: '1rem' }}>{formatMajorShort(charge, currency)}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginLeft: '0.4rem' }}>
                              ({charge} minor)
                            </span>
                          </div>
                        </div>

                        <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)', marginTop: '0.25rem' }}>
                          Exact Shapley: {num}/{den} = {formatExactFraction(num, den)} minor · Standalone: {standaloneCost} minor
                        </div>

                        <div style={{ marginTop: '0.55rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div className="bar-track" title={`Assigned Shapley charge: ${charge}`}>
                            <div className="bar-fill-shapley" style={{ width: `${chargePct}%` }} />
                          </div>
                          <div className="bar-track" title={`Standalone price: ${standaloneCost}`}>
                            <div className="bar-fill-standalone" style={{ width: `${standalonePct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : proof && 'nonmonotone' in proof ? (
                <div className="blocker-callout">
                  <strong>Split Halted Before Shapley Calculation</strong>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    Nonmonotone price decrease detected: adding a member reduced the total quote by{' '}
                    <span className="mono">{proof.nonmonotone[0]?.decrease}</span> minor units. ShareTally excludes
                    nonmonotone schedules rather than assigning negative charges.
                  </p>
                </div>
              ) : null}
            </div>

            {/* 3. Coalition Exit Check */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                3. Coalition Exit Incentive Check
              </h4>

              {proof && 'blockers' in proof && proof.blockers.length === 0 ? (
                <div className="ready-callout">
                  <strong>Core Safe — Zero Blocking Coalitions</strong>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
                    No proper subgroup can lower its cost by exiting and purchasing standalone. Every member can inspect
                    and sign the same allocation digest.
                  </p>
                </div>
              ) : proof && 'blockers' in proof && proof.blockers.length > 0 ? (
                <div className="blocker-callout">
                  <strong>
                    {proof.blockers.length} Blocking Coalition{proof.blockers.length > 1 ? 's' : ''} Detected
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {proof.blockers.slice(0, 3).map((b) => {
                      const bNames = maskToMemberNames(b.mask, members).join(' + ');
                      return (
                        <div
                          key={b.mask}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.5rem 0.65rem',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.65)',
                          }}
                        >
                          <div>
                            Subgroup <strong>{bNames}</strong>: standalone{' '}
                            <span className="mono">{b.standalone_cost}</span> vs. assigned{' '}
                            <span className="mono">{b.rounded_charge}</span> minor
                          </div>
                          <div className="mono" style={{ fontSize: '0.72rem', marginTop: '0.15rem' }}>
                            Exact excess: {b.exact_excess_numerator}/{proof.denominator} · Rounded excess: +{b.rounded_excess}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
