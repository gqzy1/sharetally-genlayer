import React, { useState } from 'react';
import type { Book } from '../../../../sdk/types';
import { formatMajorShort, maskToMemberNames } from '../../adapters/format';
import { inspectExitCoalition } from '../../domain/txAdapter';

export const ExitInspector: React.FC<{ book: Book }> = ({ book }) => {
  const { members, currency } = book.input;
  const grandMask = (1 << members.length) - 1;
  const proof = book.proof;

  const defaultMask =
    proof && 'blockers' in proof && proof.blockers.length > 0 ? proof.blockers[0].mask : 1;
  const [selectedMask, setSelectedMask] = useState<number>(defaultMask);

  if (!book.accepted || !proof) {
    return (
      <div className="notice-box">
        <strong>Exit Inspection Unavailable:</strong> Assess the sealed book first to evaluate coalition exit incentives.
      </div>
    );
  }

  const inspection = inspectExitCoalition(book, selectedMask);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Coalition Exit Incentive Inspector</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
            Select any proper subgroup <span className="mono">S</span> to compare its assigned Shapley share against
            exiting to purchase standalone.
          </p>
        </div>

        <select
          aria-label="Select exiting subgroup"
          className="select"
          style={{ width: 'auto', minWidth: '220px' }}
          value={selectedMask}
          onChange={(e) => setSelectedMask(Number(e.target.value))}
        >
          {Array.from({ length: grandMask - 1 }, (_, i) => i + 1).map((mask) => {
            const names = maskToMemberNames(mask, members).join(' + ');
            const isBlocker =
              'blockers' in proof && proof.blockers.some((b) => b.mask === mask);
            return (
              <option key={mask} value={mask}>
                #{mask}: {names} {isBlocker ? '(BLOCKER)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {inspection && (
        <>
          <div className="form-grid-2">
            <div className="card card-padded" style={{ background: 'var(--bg-canvas)' }}>
              <div className="section-eyebrow">Before Exit · Grand Coalition</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.35rem' }}>
                {members.map((m) => m.name).join(' + ')}
              </div>
              <div className="mono" style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.5rem' }}>
                <div>Grand Total C(N): {formatMajorShort(inspection.grandTotalCost, currency)} ({inspection.grandTotalCost} minor)</div>
                <div>
                  Subgroup Assigned Sum: {formatMajorShort(inspection.assignedRoundedSum, currency)} ({inspection.assignedRoundedSum} minor)
                </div>
                <div>
                  Exact Rational Sum: {inspection.assignedExactNumerator}/{inspection.denominator} minor
                </div>
              </div>
            </div>

            <div className="card card-padded" style={{ background: 'var(--bg-canvas)' }}>
              <div className="section-eyebrow">After Exit · Subgroup Leaves</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.35rem' }}>
                Exiting: {inspection.leavingNames.join(' + ')}
              </div>
              <div className="mono" style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.5rem' }}>
                <div>
                  Exiting Standalone C(S):{' '}
                  {inspection.leavingStandaloneCost !== null
                    ? `${formatMajorShort(inspection.leavingStandaloneCost, currency)} (${inspection.leavingStandaloneCost} minor)`
                    : 'UNKNOWN'}
                </div>
                <div>
                  Remaining ({inspection.remainingNames.join(' + ')}) C(N\S):{' '}
                  {inspection.remainingStandaloneCost !== null
                    ? `${formatMajorShort(inspection.remainingStandaloneCost, currency)} (${inspection.remainingStandaloneCost} minor)`
                    : 'UNKNOWN'}
                </div>
                <div>
                  Rounded Excess: +{inspection.roundedExcess} minor · Exact Excess: {inspection.exactExcessNumerator}/{inspection.denominator}
                </div>
              </div>
            </div>
          </div>

          <div className={inspection.isBlocking ? 'blocker-callout' : 'ready-callout'}>
            <strong>{inspection.verdictTitle}</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>{inspection.verdictDetail}</p>
          </div>
        </>
      )}
    </div>
  );
};
