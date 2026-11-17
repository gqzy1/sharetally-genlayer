import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Book, BookState } from '../../../sdk/types';
import { shortAddress } from '../adapters/format';
import { RELEASE_MANIFEST, isDeployedRelease } from '../adapters/release';
import { DemoBadge, StatusBadge, UndeployedBadge } from '../components/StatusBadge';
import { loadLocalDemoBooks } from '../domain/storage';
import { isValidAddress, parseBookInvitation } from '../domain/validation';
import { OFFLINE_FIXTURES } from '../fixtures/offlineFixtures';

interface CatalogItem {
  provenance: 'OFFLINE_AUTHORED' | 'OFFLINE_DEMO_DRAFT';
  book: Book;
}

const STATE_FILTERS: Array<'ALL' | BookState> = [
  'ALL',
  'SEALED',
  'REVIEW',
  'BLOCKED',
  'READY',
  'COMMITTED',
  'CANCELLED',
];

export const OfflineBooksCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const deployed = isDeployedRelease(RELEASE_MANIFEST);

  const [invitationInput, setInvitationInput] = useState('');
  const [invitationError, setInvitationError] = useState<string | null>(null);

  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [ownerChecked, setOwnerChecked] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<'ALL' | BookState>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const allItems = useMemo<CatalogItem[]>(() => {
    const localDrafts = loadLocalDemoBooks().map((d) => ({
      provenance: d.provenance,
      book: d.book,
    }));
    const authored = OFFLINE_FIXTURES.map((f) => ({
      provenance: f.provenance,
      book: f.book,
    }));
    return [...localDrafts, ...authored];
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allItems.filter(({ book }) => {
      if (stateFilter !== 'ALL' && book.state !== stateFilter) return false;
      if (!q) return true;
      const inTitle = book.input.title.toLowerCase().includes(q);
      const inId = book.id.toLowerCase().includes(q);
      const inMembers = book.input.members.some((m) => m.name.toLowerCase().includes(q));
      return inTitle || inId || inMembers;
    });
  }, [allItems, searchTerm, stateFilter]);

  const handleOpenInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBookInvitation(invitationInput);
    if (!parsed.ok) {
      setInvitationError(parsed.error);
      return;
    }
    setInvitationError(null);
    navigate(`/books/${parsed.owner}/${parsed.tag}?mode=offline`);
  };

  const handleLookupOwner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAddress(ownerQuery)) {
      setOwnerError('Enter a valid nonzero 0x owner address (42 hex characters).');
      setOwnerChecked(null);
      return;
    }
    setOwnerError(null);
    setOwnerChecked(ownerQuery.trim().toLowerCase());
  };

  return (
    <div className="container" style={{ paddingBlock: '2.5rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <UndeployedBadge />
            <DemoBadge label="OFFLINE CATALOGUE" />
          </div>
          <h1 className="editorial-title" style={{ fontSize: '2.35rem' }}>
            Book Catalogue & Invitations
          </h1>
          <p style={{ color: 'var(--ink-secondary)', maxWidth: '60ch', marginTop: '0.35rem' }}>
            Open an owner-qualified member invitation (<span className="mono">&lt;owner&gt;:&lt;tag&gt;</span>),
            inspect offline books, or search by title, tag, and member name.
          </p>
        </div>

        <Link to="/books/new" className="btn btn-primary">
          + New Quotation
        </Link>
      </div>

      {/* Invitation Parser & Owner Lookup */}
      <div className="form-grid-2" style={{ marginBottom: '2rem' }}>
        <form className="card card-padded" onSubmit={handleOpenInvitation}>
          <div className="section-eyebrow" style={{ marginBottom: '0.3rem' }}>
            Member Invitation Parser
          </div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Open Owner-Qualified Book ID
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              aria-label="Owner-qualified book ID or link"
              className={`input mono ${invitationError ? 'input-error' : ''}`}
              style={{ flex: 1, minWidth: '220px' }}
              value={invitationInput}
              onChange={(e) => setInvitationInput(e.target.value)}
              placeholder="0x1111...1111:additive-ready"
            />
            <button type="submit" className="btn btn-primary btn-sm">
              Open Book
            </button>
          </div>
          {invitationError && <div className="field-error" style={{ marginTop: '0.45rem' }}>{invitationError}</div>}
        </form>

        <form className="card card-padded" onSubmit={handleLookupOwner}>
          <div className="section-eyebrow" style={{ marginBottom: '0.3rem' }}>
            On-Chain Owner Catalogue
          </div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Query Books by Organizer Address
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              aria-label="Organizer wallet address"
              className={`input mono ${ownerError ? 'input-error' : ''}`}
              style={{ flex: 1, minWidth: '220px' }}
              value={ownerQuery}
              onChange={(e) => setOwnerQuery(e.target.value)}
              placeholder="0x1111111111111111111111111111111111111111"
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Query Chain
            </button>
          </div>
          {ownerError && <div className="field-error" style={{ marginTop: '0.45rem' }}>{ownerError}</div>}
          {ownerChecked && !deployed && (
            <div className="notice-box notice-warning" style={{ marginTop: '0.75rem' }}>
              Live RPC lookup for <span className="mono">{shortAddress(ownerChecked)}</span> is unavailable while{' '}
              <span className="mono">deployment.json</span> has <span className="mono">address: null</span>. Showing
              explicitly marked offline records below without substituting fake chain data.
            </div>
          )}
        </form>
      </div>

      {/* Search, Filter & View Toggle */}
      <div className="catalog-toolbar">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center', flex: 1 }}>
          <input
            aria-label="Search books by title, tag, or member"
            className="input"
            style={{ maxWidth: '300px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search title, tag, or member..."
          />
          <select
            aria-label="Filter by book state"
            className="select"
            style={{ width: 'auto' }}
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as 'ALL' | BookState)}
          >
            {STATE_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All States' : s}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('cards')}
          >
            Cards
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>
      </div>

      {/* Results */}
      {filteredItems.length === 0 ? (
        <div className="card card-padded" style={{ textAlign: 'center', paddingBlock: '3rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            No matching books found
          </h3>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Adjust your search filter or prepare a new offline quotation draft.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm('');
              setStateFilter('ALL');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="catalog-grid">
          {filteredItems.map(({ provenance, book }) => {
            const [owner, tag] = book.id.split(':');
            return (
              <article key={book.id} className="card catalog-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <DemoBadge label={provenance === 'OFFLINE_DEMO_DRAFT' ? 'OFFLINE DRAFT' : 'OFFLINE / DEMO'} />
                    <StatusBadge state={book.state} />
                  </div>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                    {book.input.currency} · Rev {book.revision}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{book.input.title}</h3>
                  <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.2rem', wordBreak: 'break-all' }}>
                    {book.id}
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
                  <strong>Roster ({book.input.members.length}):</strong>{' '}
                  {book.input.members.map((m) => m.name).join(', ')}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                    Approvals: {book.approvals.length}/{book.input.members.length}
                  </span>
                  <Link to={`/books/${owner}/${tag}?mode=offline`} className="btn btn-secondary btn-sm">
                    Inspect Book →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table mobile-card-table">
            <thead>
              <tr>
                <th>Title & ID</th>
                <th>Provenance</th>
                <th>State</th>
                <th>Roster</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(({ provenance, book }) => {
                const [owner, tag] = book.id.split(':');
                return (
                  <tr key={book.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{book.input.title}</div>
                      <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{book.id}</div>
                    </td>
                    <td>
                      <DemoBadge label={provenance === 'OFFLINE_DEMO_DRAFT' ? 'OFFLINE DRAFT' : 'OFFLINE / DEMO'} />
                    </td>
                    <td>
                      <StatusBadge state={book.state} />
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {book.input.members.map((m) => m.name).join(', ')}
                    </td>
                    <td>
                      <Link to={`/books/${owner}/${tag}?mode=offline`} className="btn btn-secondary btn-sm">
                        Inspect
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export {BooksCatalogPage} from './LiveBooksCatalogPage';
