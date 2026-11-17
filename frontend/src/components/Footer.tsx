import React from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { RELEASE_MANIFEST } from '../adapters/release';

export const Footer: React.FC = () => (
  <footer className="footer">
    <div className="container footer-grid">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <BrandMark size={24} />
          <strong style={{ fontSize: '1rem' }}>ShareTally</strong>
        </div>
        <p className="footer-muted">
          Consensus-backed shared quotation costs, exact Shapley allocation, and coalition exit checks.
          Participants approve immutable cost instructions — never payment custody or supplier execution.
        </p>
      </div>

      <div>
        <div className="section-eyebrow" style={{ color: '#CBD5E1', marginBottom: '0.75rem' }}>
          Workspace Routes
        </div>
        <div className="footer-links">
          <Link to="/">Overview</Link>
          <Link to="/examples">Offline Examples</Link>
          <Link to="/books">Book Catalogue</Link>
          <Link to="/books/new">Prepare Quotation</Link>
        </div>
      </div>

      <div>
        <div className="section-eyebrow" style={{ color: '#CBD5E1', marginBottom: '0.75rem' }}>
          Release Manifest
        </div>
        <div className="footer-muted mono" style={{ fontSize: '0.75rem' }}>
          <div>Protocol: {RELEASE_MANIFEST.protocol}</div>
          <div>Status: {RELEASE_MANIFEST.status}</div>
          <div>Chain: Stable Studionet ({RELEASE_MANIFEST.chainId})</div>
          <div>SDK: {RELEASE_MANIFEST.sdk}</div>
          <div>SHA-256: {RELEASE_MANIFEST.sourceSha256.slice(0, 14)}…</div>
        </div>
      </div>
    </div>
  </footer>
);
