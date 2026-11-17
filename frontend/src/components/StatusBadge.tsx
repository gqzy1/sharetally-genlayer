import React from 'react';
import type { BookState } from '../../../sdk/types';

export const StatusBadge: React.FC<{ state: BookState }> = ({ state }) => (
  <span className={`badge badge-${state}`} aria-label={`Book state: ${state}`}>
    {state}
  </span>
);

export const DemoBadge: React.FC<{ label?: string }> = ({ label = 'OFFLINE / DEMO' }) => (
  <span className="badge badge-DEMO" aria-label="Offline authored demonstration data">
    {label}
  </span>
);

export const UndeployedBadge: React.FC = () => (
  <span className="badge badge-UNDEPLOYED" aria-label="Contract not deployed">
    NOT DEPLOYED
  </span>
);
