import React from 'react';
import { Link } from 'react-router-dom';
import { UndeployedBadge } from '../StatusBadge';

interface EmptyStateProps {
  title: string;
  description: string;
  phaseNote: string;
  primaryAction?: { label: string; to: string };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  phaseNote,
  primaryAction,
}) => (
  <div className="container" style={{ paddingBlock: '3.5rem' }}>
    <div className="card card-padded" style={{ maxWidth: '720px', marginInline: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <UndeployedBadge />
        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
          {phaseNote}
        </span>
      </div>
      <h1 className="editorial-title" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
        {title}
      </h1>
      <p style={{ color: 'var(--ink-secondary)', marginBottom: '1.5rem', lineHeight: 1.65 }}>
        {description}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {primaryAction && (
          <Link to={primaryAction.to} className="btn btn-primary">
            {primaryAction.label}
          </Link>
        )}
        <Link to="/" className="btn btn-secondary">
          Back to Overview
        </Link>
      </div>
    </div>
  </div>
);
