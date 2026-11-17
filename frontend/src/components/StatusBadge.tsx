import React from 'react';
import {RELEASE_MANIFEST,isDeployedRelease} from '../adapters/release';
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
  <span className="badge badge-UNDEPLOYED" aria-label={isDeployedRelease(RELEASE_MANIFEST)?"Verified deployment configured":"Contract not deployed"}>
    {isDeployedRelease(RELEASE_MANIFEST)?"STUDIONET 61999":"NOT DEPLOYED"}
  </span>
);
