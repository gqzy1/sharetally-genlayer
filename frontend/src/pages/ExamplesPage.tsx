import React from 'react';
import { ShapleyDemo } from '../components/ShapleyDemo';
import { DemoBadge } from '../components/StatusBadge';

export const ExamplesPage: React.FC = () => (
  <div className="container" style={{ paddingBlock: '3rem' }}>
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
        <DemoBadge label="OFFLINE / DEMO · NO SIGNER OR RPC" />
      </div>
      <h1 className="editorial-title" style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>
        Offline Coalition & Shapley Examples
      </h1>
      <p style={{ color: 'var(--ink-secondary)', maxWidth: '62ch' }}>
        Inspect how ShareTally evaluates additive splits, coalition exit objections, minor-unit rounding
        blockers, and nonmonotone price drops using canonical fixtures exported by{' '}
        <span className="mono">scripts/export_fixtures.py</span>.
      </p>
    </div>

    <ShapleyDemo />
  </div>
);
