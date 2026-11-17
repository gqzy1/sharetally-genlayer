import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Book } from '../../../sdk/types';
import { shortAddress } from '../adapters/format';
import { RELEASE_MANIFEST, isDeployedRelease } from '../adapters/release';
import { DemoBadge, StatusBadge, UndeployedBadge } from '../components/StatusBadge';
import { ApprovalPanel } from '../components/workspace/ApprovalPanel';
import { AuditHistoryPanel } from '../components/workspace/AuditHistoryPanel';
import { CoalitionTable } from '../components/workspace/CoalitionTable';
import { ExitInspector } from '../components/workspace/ExitInspector';
import { ShapleyBreakdown } from '../components/workspace/ShapleyBreakdown';
import { loadLocalDemoBooks } from '../domain/storage';
import { OFFLINE_FIXTURES } from '../fixtures/offlineFixtures';

type WorkspaceTab = 'allocation' | 'coalitions' | 'exit' | 'approvals' | 'audit';

export const OfflineBookWorkspacePage: React.FC = () => {
  const { owner, tag } = useParams<{ owner: string; tag: string }>();
  const deployed = isDeployedRelease(RELEASE_MANIFEST);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('allocation');

  const bookId = owner && tag ? `${owner.toLowerCase()}:${tag}` : '';

  const resolved = useMemo<{
    provenance: 'OFFLINE_AUTHORED' | 'OFFLINE_DEMO_DRAFT';
    book: Book;
  } | null>(() => {
    const local = loadLocalDemoBooks().find((d) => d.book.id.toLowerCase() === bookId);
    if (local) return { provenance: local.provenance, book: local.book };
    const fixture = OFFLINE_FIXTURES.find((f) => f.book.id.toLowerCase() === bookId);
    if (fixture) return { provenance: fixture.provenance, book: fixture.book };
    return null;
  }, [bookId]);

  if (!resolved) {
    return (
      <div className="container" style={{ paddingBlock: '3.5rem' }}>
        <div className="card card-padded" style={{ maxWidth: '720px', marginInline: 'auto' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            <UndeployedBadge />
          </div>
          <h1 className="editorial-title" style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>
            Book Not Found Locally
          </h1>
          <p style={{ color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
            No offline fixture or local draft matched <span className="mono">{bookId || 'unknown'}</span>.
            {!deployed &&
              ' Live RPC lookup is disabled while deployment.json has address: null, and this workspace never falls back to unrelated mock data.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/books" className="btn btn-primary">
              Browse Catalogue
            </Link>
            <Link to="/books/new" className="btn btn-secondary">
              Prepare New Quotation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { book, provenance } = resolved;

  const handleExportJson = () => {
    const payload = {
      provenance,
      chainId: RELEASE_MANIFEST.chainId,
      contractAddress: RELEASE_MANIFEST.address,
      sourceSha256: RELEASE_MANIFEST.sourceSha256,
      book,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tag || 'sharetally-book'}-${provenance.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'allocation', label: 'Shapley Split' },
    { id: 'coalitions', label: 'Coalition Costs' },
    { id: 'exit', label: 'Exit Check' },
    { id: 'approvals', label: `Approvals (${book.approvals.length}/${book.input.members.length})` },
    { id: 'audit', label: 'Audit History' },
  ];

  return (
    <div className="container" style={{ paddingBlock: '2.5rem 4rem' }}>
      {/* Workspace Header */}
      <div className="card card-padded" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <DemoBadge label={provenance === 'OFFLINE_AUTHORED' ? 'OFFLINE / DEMO · OFFLINE_AUTHORED' : 'OFFLINE DRAFT'} />
              <StatusBadge state={book.state} />
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                {book.input.currency} · Revision {book.revision}
              </span>
            </div>
            <h1 className="editorial-title" style={{ fontSize: '2.15rem' }}>
              {book.input.title}
            </h1>
            <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '0.3rem', wordBreak: 'break-all' }}>
              Book ID: {book.id} · Owner: {shortAddress(book.owner)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportJson}>
              Export Offline JSON
            </button>
            <Link to="/books" className="btn btn-ghost btn-sm">
              ← Catalogue
            </Link>
          </div>
        </div>

        {/* Immutable Quote & Roster Summary */}
        <div className="form-grid-2" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-hairline)' }}>
          <div>
            <div className="section-eyebrow" style={{ marginBottom: '0.4rem' }}>
              Immutable Sealed Quotation
            </div>
            <div className="ledger-quote-box">“{book.input.quotation}”</div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: '0.4rem' }}>
              Source Locator: {book.input.source_locator || 'None declared'} (unverified declaration)
            </div>
          </div>

          <div>
            <div className="section-eyebrow" style={{ marginBottom: '0.4rem' }}>
              Immutable Roster & Rounding Order
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.84rem' }}>
              {book.input.members.map((m, idx) => (
                <div key={m.address} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span>
                    <strong>{m.name}</strong>{' '}
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                      (bit #{1 << idx})
                    </span>
                  </span>
                  <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>
                    {shortAddress(m.address)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: '0.5rem', wordBreak: 'break-all' }}>
              Input Hash: {book.input_hash}
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="demo-tabs" role="tablist" aria-label="Book workspace sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`demo-tab ${activeTab === t.id ? 'demo-tab-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Workspace Panel */}
      <div className="card card-padded">
        {activeTab === 'allocation' && <ShapleyBreakdown book={book} />}
        {activeTab === 'coalitions' && <CoalitionTable book={book} />}
        {activeTab === 'exit' && <ExitInspector book={book} />}
        {activeTab === 'approvals' && <ApprovalPanel book={book} />}
        {activeTab === 'audit' && <AuditHistoryPanel book={book} provenance={provenance} />}
      </div>
    </div>
  );
};

export {BookWorkspacePage} from './LiveBookWorkspacePage';
