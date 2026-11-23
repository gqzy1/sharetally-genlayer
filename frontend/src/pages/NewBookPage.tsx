import {useWallet} from '../app/WalletProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Currency, Member } from '../../../sdk/types';
import { RELEASE_MANIFEST, isDeployedRelease } from '../adapters/release';
import { formatMajorShort, shortAddress } from '../adapters/format';
import { DemoBadge, StatusBadge, UndeployedBadge } from '../components/StatusBadge';
import {
  clearDraft,
  createInitialDraft,
  loadDraft,
  saveDraft,
  saveLocalDemoBook,
} from '../domain/storage';
import {
  PROTOCOL_LIMITS,
  parseMajorToMinor,
  validateDraftBook,
  type DraftBookInput,
} from '../domain/validation';

export const NewBookPage: React.FC = () => {
  const navigate = useNavigate();
  const wallet=useWallet();
  const [liveError,setLiveError]=useState('');
  const [liveConfirm,setLiveConfirm]=useState(false);
  const sealLive=async()=>{try{setLiveError('');if(wallet.signer?.toLowerCase()!==draft.organizerAddress.toLowerCase())throw Error('Connected wallet must be the organizer and a named member');const result=await wallet.send({method:'seal',tag:draft.tag,specification:draft.specification});const [owner,tag]=result.book.id.split(':');navigate(`/books/${owner}/${tag}?mode=live`)}catch(e){setLiveError(String(e))}};
  const deployed = isDeployedRelease(RELEASE_MANIFEST);

  const [draft, setDraft] = useState<DraftBookInput>(() => {
    const restored = loadDraft();
    return restored ? restored.draft : createInitialDraft();
  });
  const [restoredAt, setRestoredAt] = useState<string | null>(() => loadDraft()?.savedAt ?? null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Structured coalition price helper state
  const [helperMask, setHelperMask] = useState<number>(1);
  const [helperMajor, setHelperMajor] = useState<string>('1.50');
  const [helperError, setHelperError] = useState<string | null>(null);

  useEffect(() => {
    const saved = saveDraft(draft);
    setLastSavedAt(saved.savedAt);
  }, [draft]);

  const { valid, errors } = useMemo(() => validateDraftBook(draft), [draft]);
  const { specification } = draft;
  const members = specification.members;

  const updateSpec = <K extends keyof DraftBookInput['specification']>(
    key: K,
    value: DraftBookInput['specification'][K],
  ) => {
    setDraft((prev) => ({
      ...prev,
      specification: { ...prev.specification, [key]: value },
    }));
  };

  const updateMember = (idx: number, patch: Partial<Member>) => {
    const next = members.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    updateSpec('members', next);
  };

  const addMember = () => {
    if (members.length >= PROTOCOL_LIMITS.MEMBER_MAX) return;
    const nextIdx = members.length + 1;
    const hexDigit = String(nextIdx);
    updateSpec('members', [
      ...members,
      {
        name: `Member ${nextIdx}`,
        address: `0x${hexDigit.repeat(40)}` as `0x${string}`,
        description: 'Standard participant allocation',
      },
    ]);
  };

  const removeMember = (idx: number) => {
    if (members.length <= PROTOCOL_LIMITS.MEMBER_MIN) return;
    updateSpec(
      'members',
      members.filter((_, i) => i !== idx),
    );
  };

  const moveMember = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= members.length) return;
    const copy = [...members];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    updateSpec('members', copy);
  };

  const handleInsertHelperPrice = () => {
    const parsed = parseMajorToMinor(helperMajor);
    if (!parsed.ok) {
      setHelperError(parsed.error);
      return;
    }
    setHelperError(null);
    const names = members
      .filter((_, i) => (helperMask & (1 << i)) !== 0)
      .map((m, i) => m.name.trim() || `Member ${i + 1}`);
    if (names.length === 0) {
      setHelperError('Select at least one member for the coalition.');
      return;
    }
    const snippet = `${names.join(',')} = ${parsed.minor}`;
    const current = specification.quotation.trimEnd();
    const sep = current.length === 0 ? '' : current.endsWith(';') || current.endsWith('.') ? ' ' : '; ';
    updateSpec('quotation', `${current}${sep}${snippet}`);
  };

  const handleResetDraft = () => {
    clearDraft();
    const fresh = createInitialDraft();
    setDraft(fresh);
    setRestoredAt(null);
    setSavedNotice('Draft reset to clean baseline.');
  };

  const handleSaveOfflineDemo = () => {
    if (!valid) return;
    const created = saveLocalDemoBook(draft);
    setShowConfirmModal(false);
    setSavedNotice(`Saved offline demo book (${created.book.id}).`);
  };

  const sealEntry=wallet.entries.slice().reverse().find(e=>e.intent.method==='seal'&&e.intent.tag===draft.tag&&e.signer.toLowerCase()===wallet.signer?.toLowerCase()&&!e.verified&&!['REJECTED','FAILED'].includes(e.phase));
  const subsetCount = (1 << members.length) - 1;
  const maxMask = subsetCount;

  return (
    <div className="container" style={{ paddingBlock: '2.5rem 4rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <UndeployedBadge />
            {restoredAt && (
              <span className="badge badge-DEMO">Draft Restored</span>
            )}
            {lastSavedAt && (
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                Auto-saved locally
              </span>
            )}
          </div>
          <h1 className="editorial-title" style={{ fontSize: '2.35rem' }}>
            Prepare a Shared Quotation
          </h1>
          <p style={{ color: 'var(--ink-secondary)', maxWidth: '60ch', marginTop: '0.35rem' }}>
            Seal an immutable quotation, currency, and deterministic 2–4 member roster. Roster order sets
            coalition bitmasks and minor-unit rounding tie-breaking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetDraft}>
            Reset Draft
          </button>
          <Link to="/books" className="btn btn-ghost btn-sm">
            View Catalogue →
          </Link>
        </div>
      </div>

      {savedNotice && (
        <div className="notice-box notice-success" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>
            <strong>{savedNotice}</strong> Marked strictly as <span className="mono">OFFLINE / DEMO</span> (no chain write occurred).
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/books')}>
            Open Catalogue
          </button>
        </div>
      )}

      <div className="workspace-layout">
        {/* Left: Interactive Form */}
        <div className="form-section">
          {/* 1. Identity & Currency */}
          <section className="card card-padded">
            <div className="section-eyebrow" style={{ marginBottom: '0.35rem' }}>
              01 · Book Identity & Currency
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Basic Information
            </h2>

            <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
              <div className="field">
                <div className="field-header">
                  <label className="field-label" htmlFor="book-tag">
                    Book Tag
                  </label>
                  <span className={`char-counter ${errors.tag ? 'char-counter-error' : ''}`}>
                    {draft.tag.length}/{PROTOCOL_LIMITS.TAG_MAX}
                  </span>
                </div>
                <input
                  id="book-tag"
                  className={`input mono ${errors.tag ? 'input-error' : ''}`}
                  value={draft.tag}
                  onChange={(e) => setDraft((p) => ({ ...p, tag: e.target.value.toLowerCase() }))}
                  placeholder="shared-print-2026"
                />
                {errors.tag ? (
                  <span className="field-error">{errors.tag}</span>
                ) : (
                  <span className="field-hint">3–32 lowercase letters, digits, or hyphens.</span>
                )}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="book-currency">
                  Currency (2-decimal minor units)
                </label>
                <select
                  id="book-currency"
                  className="select"
                  value={specification.currency}
                  onChange={(e) => updateSpec('currency', e.target.value as Currency)}
                >
                  <option value="GBP">GBP (£ · 100 minor = £1.00)</option>
                  <option value="USD">USD ($ · 100 minor = $1.00)</option>
                  <option value="EUR">EUR (€ · 100 minor = €1.00)</option>
                </select>
                <span className="field-hint">No exchange conversion is performed on-chain.</span>
              </div>
            </div>

            <div className="field" style={{ marginBottom: '1rem' }}>
              <div className="field-header">
                <label className="field-label" htmlFor="book-title">
                  Purchase Title
                </label>
                <span className={`char-counter ${errors.title ? 'char-counter-error' : ''}`}>
                  {specification.title.length}/{PROTOCOL_LIMITS.TITLE_MAX}
                </span>
              </div>
              <input
                id="book-title"
                className={`input ${errors.title ? 'input-error' : ''}`}
                value={specification.title}
                onChange={(e) => updateSpec('title', e.target.value)}
                placeholder="Shared exhibitor print run"
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>

            <div className="form-grid-2">
              <div className="field">
                <div className="field-header">
                  <label className="field-label" htmlFor="book-locator">
                    Source Locator (Optional Declaration)
                  </label>
                  <span className={`char-counter ${errors.source_locator ? 'char-counter-error' : ''}`}>
                    {specification.source_locator.length}/{PROTOCOL_LIMITS.LOCATOR_MAX}
                  </span>
                </div>
                <input
                  id="book-locator"
                  className={`input ${errors.source_locator ? 'input-error' : ''}`}
                  value={specification.source_locator}
                  onChange={(e) => updateSpec('source_locator', e.target.value)}
                  placeholder="Supplier quote # or reference note"
                />
                {errors.source_locator ? (
                  <span className="field-error">{errors.source_locator}</span>
                ) : (
                  <span className="field-hint">Stored as an unverified declaration; never fetched.</span>
                )}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="book-organizer">
                  Organizer Wallet (Creator)
                </label>
                <input
                  id="book-organizer"
                  className={`input mono ${errors.organizerAddress ? 'input-error' : ''}`}
                  value={draft.organizerAddress}
                  onChange={(e) => setDraft((p) => ({ ...p, organizerAddress: e.target.value }))}
                  placeholder="0x..."
                />
                {errors.organizerAddress ? (
                  <span className="field-error">{errors.organizerAddress}</span>
                ) : (
                  <span className="field-hint">Must match one of the named roster wallets below.</span>
                )}
              </div>
            </div>
          </section>

          {/* 2. Member Roster */}
          <section className="card card-padded">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div className="section-eyebrow" style={{ marginBottom: '0.25rem' }}>
                  02 · Deterministic Member Roster ({members.length}/{PROTOCOL_LIMITS.MEMBER_MAX})
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Named Wallets & Tie-Breaking Order
                </h2>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addMember}
                disabled={members.length >= PROTOCOL_LIMITS.MEMBER_MAX}
              >
                + Add Member
              </button>
            </div>

            {errors.membersGeneral && (
              <div className="blocker-callout" style={{ marginBottom: '1rem' }}>
                {errors.membersGeneral}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {members.map((member, idx) => {
                const mErr = errors.members[idx] ?? {};
                const bit = 1 << idx;
                return (
                  <div key={idx} className="member-card">
                    <div className="member-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="member-bit-pill">
                          Index {idx} · Bit #{bit}
                        </span>
                        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                          Tie Priority #{idx + 1}
                        </span>
                      </div>

                      <div className="member-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => moveMember(idx, -1)}
                          disabled={idx === 0}
                          aria-label={`Move ${member.name || `member ${idx + 1}`} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => moveMember(idx, 1)}
                          disabled={idx === members.length - 1}
                          aria-label={`Move ${member.name || `member ${idx + 1}`} down`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeMember(idx)}
                          disabled={members.length <= PROTOCOL_LIMITS.MEMBER_MIN}
                          aria-label={`Remove ${member.name || `member ${idx + 1}`}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="field">
                        <label className="field-label" htmlFor={`m-name-${idx}`}>
                          Member Name
                        </label>
                        <input
                          id={`m-name-${idx}`}
                          className={`input ${mErr.name ? 'input-error' : ''}`}
                          value={member.name}
                          onChange={(e) => updateMember(idx, { name: e.target.value })}
                          placeholder="Ada"
                        />
                        {mErr.name && <span className="field-error">{mErr.name}</span>}
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`m-addr-${idx}`}>
                          Wallet Address
                        </label>
                        <input
                          id={`m-addr-${idx}`}
                          className={`input mono ${mErr.address ? 'input-error' : ''}`}
                          value={member.address}
                          onChange={(e) => updateMember(idx, { address: e.target.value as `0x${string}` })}
                          placeholder="0x..."
                        />
                        {mErr.address && <span className="field-error">{mErr.address}</span>}
                      </div>
                    </div>

                    <div className="field">
                      <div className="field-header">
                        <label className="field-label" htmlFor={`m-desc-${idx}`}>
                          Order / Scope Description
                        </label>
                        <span className={`char-counter ${mErr.description ? 'char-counter-error' : ''}`}>
                          {member.description.length}/{PROTOCOL_LIMITS.DESC_MAX}
                        </span>
                      </div>
                      <input
                        id={`m-desc-${idx}`}
                        className={`input ${mErr.description ? 'input-error' : ''}`}
                        value={member.description}
                        onChange={(e) => updateMember(idx, { description: e.target.value })}
                        placeholder="One identical print order"
                      />
                      {mErr.description && <span className="field-error">{mErr.description}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. Quotation & Minor-Unit Helper */}
          <section className="card card-padded">
            <div className="section-eyebrow" style={{ marginBottom: '0.35rem' }}>
              03 · Supplier Quotation & Precision
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Complete Quotation Text
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
              GenLayer consensus audits this exact text for every nonempty subset ({subsetCount} combinations).
              Include explicit standalone prices in minor units (100 minor = 1.00 {specification.currency}).
            </p>

            {/* Minor-unit price helper */}
            <div
              style={{
                padding: '0.9rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-hairline)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Coalition Minor-Unit Entry Helper
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  aria-label="Select coalition subset"
                  className="select"
                  style={{ width: 'auto', minWidth: '180px' }}
                  value={Math.min(helperMask, maxMask)}
                  onChange={(e) => setHelperMask(Number(e.target.value))}
                >
                  {Array.from({ length: subsetCount }, (_, i) => i + 1).map((mask) => {
                    const label = members
                      .filter((_, idx) => (mask & (1 << idx)) !== 0)
                      .map((m, idx) => m.name.trim() || `M${idx + 1}`)
                      .join(' + ');
                    return (
                      <option key={mask} value={mask}>
                        #{mask}: {label}
                      </option>
                    );
                  })}
                </select>
                <input
                  aria-label="Major currency amount"
                  className="input mono"
                  style={{ width: '130px' }}
                  value={helperMajor}
                  onChange={(e) => setHelperMajor(e.target.value)}
                  placeholder="1.50"
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleInsertHelperPrice}>
                  Append to Quote
                </button>
              </div>
              {helperError && (
                <div className="field-error" style={{ marginTop: '0.4rem' }}>
                  {helperError}
                </div>
              )}
            </div>

            <div className="field">
              <div className="field-header">
                <label className="field-label" htmlFor="book-quotation">
                  Quotation Evidence
                </label>
                <span className={`char-counter ${errors.quotation ? 'char-counter-error' : ''}`}>
                  {specification.quotation.length}/{PROTOCOL_LIMITS.QUOTATION_MAX}
                </span>
              </div>
              <textarea
                id="book-quotation"
                rows={5}
                className={`textarea ${errors.quotation ? 'input-error' : ''}`}
                value={specification.quotation}
                onChange={(e) => updateSpec('quotation', e.target.value)}
                placeholder="Paste complete supplier quotation with explicit prices for each member subset..."
              />
              {errors.quotation && <span className="field-error">{errors.quotation}</span>}
            </div>
          </section>
        </div>

        {/* Right: Sticky Pre-Seal Preview */}
        <aside className="sticky-preview">
          <div className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <StatusBadge state="SEALED" />
              <DemoBadge label={deployed ? 'LIVE CONTRACT' : 'NOT DEPLOYED'} />
            </div>

            <div>
              <div className="section-eyebrow">Pre-Seal Summary</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {specification.title || 'Untitled quotation'}
              </h3>
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.25rem', wordBreak: 'break-all' }}>
                ID: {(draft.organizerAddress || '0x…').toLowerCase()}:{draft.tag || '…'}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '0.85rem' }}>
              <div className="section-eyebrow" style={{ marginBottom: '0.5rem' }}>
                Roster & Bitmasks ({subsetCount} subsets)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {members.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span>
                      <strong>{m.name || `Member ${idx + 1}`}</strong>{' '}
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
            </div>

            <div className="notice-box notice-warning">
              <strong>Immutable Upon Seal:</strong> Once sealed on-chain, title, currency, quotation, and member
              order cannot be edited.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!valid}
                onClick={() => {setLiveConfirm(false);setShowConfirmModal(true)}}
              >
                {valid ? 'Review Pre-Seal Confirmation' : 'Fix Validation Errors to Continue'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={!deployed || !valid || !wallet.sourceReady || !wallet.signer || wallet.busy}
                onClick={()=>{setLiveConfirm(true);setShowConfirmModal(true)}}
              >
                Seal On-Chain
              </button>
            </div>
          </div>
        </aside>
      </div>

      {liveError&&!showConfirmModal&&<p role="alert">{liveError}</p>}
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-seal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(20, 21, 26, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div className="card card-padded" style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <DemoBadge label={liveConfirm ? "LIVE IMMUTABLE SEAL REVIEW" : "OFFLINE PRE-SEAL REVIEW"} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowConfirmModal(false)}>
                Close
              </button>
            </div>
            <h2 id="confirm-seal-title" className="editorial-title" style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>
              Confirm Immutable Specification
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
              {liveConfirm ? 'This signs a real Stable Studionet transaction using capped testnet GEN fees. The quotation and roster are immutable. The transaction is only verified after FINALIZED, successful execution, majority agreement, and latest-final state readback.' : 'Save a clearly marked offline example in this browser. No transaction or member signature is created.'}
            </p>

            {liveConfirm&&liveError&&<p role="alert" className="notice-box notice-warning">{liveError}</p>}
            {liveConfirm&&sealEntry&&<p role="status">{sealEntry.phase} · {sealEntry.pending?<Link to={`/transactions/${sealEntry.pending.hash}`}>Track or resume original transaction</Link>:'Do not resubmit. Reconcile this wallet’s transaction history before retrying.'}</p>}
            <div className="ledger-quote-box" style={{ marginBottom: '1rem' }}>
              <div><strong>Title:</strong> {specification.title}</div>
              <div><strong>Currency:</strong> {specification.currency} ({formatMajorShort(100, specification.currency)} = 100 minor)</div>
              <div><strong>Members:</strong> {members.map((m) => m.name).join(' → ')}</div>
              <div style={{ marginTop: '0.4rem' }}><strong>Quotation:</strong> {specification.quotation}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>
                Back to Edit
              </button>
              <button type="button" className="btn btn-primary" disabled={wallet.busy||(liveConfirm&&!!sealEntry)} onClick={()=>{if(liveConfirm)void sealLive();else handleSaveOfflineDemo()}}>
                {liveConfirm ? (wallet.busy?'Waiting for FINALIZED…':'Confirm Live Seal') : 'Save as Offline Demo Book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
