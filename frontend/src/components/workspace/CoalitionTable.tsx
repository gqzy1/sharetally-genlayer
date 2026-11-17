import React from 'react';
import type { Book } from '../../../../sdk/types';
import { formatMinorUnits, maskToMemberNames } from '../../adapters/format';

export const CoalitionTable: React.FC<{ book: Book }> = ({ book }) => {
  const { members, currency } = book.input;
  const rows = book.accepted?.rows ?? [];

  if (rows.length === 0) {
    return (
      <div className="notice-box">
        <strong>Pre-Assessment State ({book.state}):</strong> No coalition cost rows have been accepted yet.
        Consensus assessment evaluates all <span className="mono">{(1 << members.length) - 1}</span> nonempty subsets.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
          Coalition Cost Matrix ({rows.length} Nonempty Subsets)
        </h3>
        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
          Empty coalition C(∅) = 0 by protocol · Currency: {currency}
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table mobile-card-table">
          <thead>
            <tr>
              <th>Mask</th>
              <th>Coalition Members</th>
              <th>Status</th>
              <th>Standalone Total</th>
              <th>Accepted Quote Excerpt</th>
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
                  <td>
                    <span className={`badge ${row.status === 'KNOWN' ? 'badge-READY' : 'badge-REVIEW'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {row.status === 'KNOWN' ? formatMinorUnits(row.cost, currency) : 'UNKNOWN'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                    {row.quote || 'Missing or ambiguous term in quotation'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
