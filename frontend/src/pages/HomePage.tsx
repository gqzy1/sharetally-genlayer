import React from 'react';
import { Link } from 'react-router-dom';
import { getOfflineFixture } from '../fixtures/offlineFixtures';
import { formatExactFraction, formatMajorShort } from '../adapters/format';
import { RELEASE_MANIFEST } from '../adapters/release';
import { DemoBadge, StatusBadge, UndeployedBadge } from '../components/StatusBadge';
import { ShapleyDemo } from '../components/ShapleyDemo';
import { WorkflowStepper } from '../components/WorkflowStepper';

export const HomePage: React.FC = () => {
  const heroFixture = getOfflineFixture('additive-ready');
  const heroBook = heroFixture?.book;
  const heroProof = heroBook?.proof && 'charges' in heroBook.proof ? heroBook.proof : null;

  return (
    <div>
      {/* 1. Editorial Hero */}
      <section className="hero-section">
        <div className="container hero-grid">
          <div>
            <div className="section-eyebrow">
              <span>SHARETALLY-1 PROTOCOL</span>
              <span>·</span>
              <span>CONSENSUS-BACKED COST ALLOCATION</span>
            </div>

            <h1 className="editorial-title hero-headline">
              Share a quote. Inspect the split. Sign the same plan.
            </h1>

            <p className="hero-sub">
              A cheaper group quote does not guarantee a split every subgroup will accept. ShareTally seals a
              shared quotation, verifies all <span className="mono">2ⁿ − 1</span> coalition prices via GenLayer
              consensus, computes exact Shapley shares, and exposes any subgroup exit objection before wallets sign.
            </p>

            <div className="hero-cta-row">
              <Link to="/examples" className="btn btn-primary">
                Explore Offline Examples
              </Link>
              <Link to="/books/new" className="btn btn-secondary">
                Prepare a Quotation
              </Link>
              <Link to="/books" className="btn btn-ghost">
                Inspect Catalogue →
              </Link>
            </div>

            <div className="hero-metrics">
              <div>
                <div className="hero-metric-val">2–4</div>
                <div className="hero-metric-label">Named member wallets per book</div>
              </div>
              <div>
                <div className="hero-metric-val">aᵢ / n!</div>
                <div className="hero-metric-label">Exact rational Shapley arithmetic</div>
              </div>
              <div>
                <div className="hero-metric-val">2ⁿ − 1</div>
                <div className="hero-metric-label">Coalition exit checks before READY</div>
              </div>
            </div>
          </div>

          {/* Hero Mini-Ledger Card */}
          {heroBook && heroProof && (
            <aside className="ledger-preview" aria-label="Offline sample Shapley ledger preview">
              <div className="ledger-preview-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DemoBadge label="OFFLINE / DEMO" />
                  <StatusBadge state={heroBook.state} />
                </div>
                <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                  {heroBook.input.currency} · Rev {heroBook.revision}
                </span>
              </div>

              <div className="ledger-preview-body">
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Sealed Quotation</div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: '0.15rem' }}>
                    {heroBook.input.title}
                  </div>
                </div>

                <div className="ledger-quote-box">
                  “{heroBook.input.quotation}”
                </div>

                <div>
                  <div className="section-eyebrow" style={{ marginBottom: '0.5rem' }}>
                    Exact Shapley Attribution
                  </div>
                  {heroBook.input.members.map((m, idx) => (
                    <div key={m.address} className="ledger-share-row">
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{m.name}</strong>
                        <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>
                          {m.address.slice(0, 8)}…{m.address.slice(-4)}
                        </div>
                      </div>
                      <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>
                        {formatExactFraction(heroProof.numerators[idx], heroProof.denominator)} minor
                      </span>
                      <strong className="mono" style={{ fontSize: '0.95rem' }}>
                        {formatMajorShort(heroProof.charges[idx], heroBook.input.currency)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-hairline)',
                    fontSize: '0.78rem',
                    color: 'var(--status-ready-fg)',
                    fontWeight: 600,
                  }}
                >
                  <span>0 blocking coalitions detected</span>
                  <span className="mono">Digest {heroBook.allocation_hash?.slice(0, 10)}…</span>
                </div>
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* 2. Interactive Shapley & Coalition Exit Explorer */}
      <section className="section-block">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Interactive Offline Explorer</div>
              <h2 className="editorial-title section-title">
                Why equal division fails — and how Shapley exposes exit risk
              </h2>
            </div>
            <p className="section-desc">
              Switch between canonical offline fixtures generated by the contract host oracle. Inspect how
              group discounts, subgroup standalone prices, and minor-unit rounding determine{' '}
              <span className="mono">READY</span> vs. <span className="mono">BLOCKED</span>.
            </p>
          </div>

          <ShapleyDemo />
        </div>
      </section>

      {/* 3. Protocol Lifecycle */}
      <section className="section-block" style={{ background: 'var(--bg-surface)' }}>
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Deterministic State Machine</div>
              <h2 className="editorial-title section-title">
                Six stages from sealed quotation to committed plan
              </h2>
            </div>
            <p className="section-desc">
              Every non-seal mutation requires the exact current revision. Assessed books cannot be
              reassessed; a corrected quote creates a fresh immutable book.
            </p>
          </div>

          <WorkflowStepper />
        </div>
      </section>

      {/* 4. Trust Boundaries & Honest Release Status */}
      <section className="section-block">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Verification & Trust Boundaries</div>
              <h2 className="editorial-title section-title">
                Honest release status before any chain write
              </h2>
            </div>
            <UndeployedBadge />
          </div>

          <div className="trust-grid">
            <article className="card card-padded">
              <div className="section-eyebrow" style={{ marginBottom: '0.5rem' }}>
                01 · Release Manifest
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Not Yet Deployed
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
                <span className="mono">deployment.json</span> currently sets <span className="mono">address: null</span>{' '}
                on Stable Studionet (Chain <span className="mono">{RELEASE_MANIFEST.chainId}</span>). All chain writes
                remain disabled until a verified contract address is published.
              </p>
            </article>

            <article className="card card-padded">
              <div className="section-eyebrow" style={{ marginBottom: '0.5rem' }}>
                02 · Scope of Consensus
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Declared Quote, Not Payment
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
                Consensus audits the sealed quotation text and arithmetic, not supplier authenticity or
                off-chain invoices. Members sign immutable cost instructions — never escrow or custody.
              </p>
            </article>

            <article className="card card-padded">
              <div className="section-eyebrow" style={{ marginBottom: '0.5rem' }}>
                03 · Offline Provenance
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Strict Data Separation
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
                Every demonstration figure on this page carries <span className="mono">OFFLINE_AUTHORED</span>{' '}
                provenance from <span className="mono">examples/offline-fixtures.json</span> and never mimics
                live validator receipts.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
};
