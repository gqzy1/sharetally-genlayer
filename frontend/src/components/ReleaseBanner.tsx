import React from 'react';
import { RELEASE_MANIFEST, isDeployedRelease } from '../adapters/release';

export const ReleaseBanner: React.FC = () => {
  const deployed = isDeployedRelease(RELEASE_MANIFEST);
  if (deployed) return null;

  return (
    <div className="release-banner" role="status" aria-live="polite">
      <div className="container release-banner-inner">
        <div className="release-banner-left">
          <span className="release-dot" aria-hidden="true" />
          <span>
            <strong>Release Status: NOT DEPLOYED</strong> — Chain writes, wallet signing, and live consensus are disabled until a verified contract address is configured.
          </span>
        </div>
        <div className="release-banner-meta">
          Stable Studionet ({RELEASE_MANIFEST.chainId}) · {RELEASE_MANIFEST.sdk} · Source {RELEASE_MANIFEST.sourceSha256.slice(0, 10)}…
        </div>
      </div>
    </div>
  );
};
