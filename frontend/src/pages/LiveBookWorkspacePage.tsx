import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Book, WriteIntent } from '../../../sdk/types';
import { readBook } from '../../../sdk/client';
import { useWallet } from '../app/WalletProvider';
import { RELEASE_MANIFEST as release } from '../adapters/release';
import { OfflineBookWorkspacePage } from './BookWorkspacePage';
import { StatusBadge } from '../components/StatusBadge';
import { ShapleyBreakdown } from '../components/workspace/ShapleyBreakdown';
import { CoalitionTable } from '../components/workspace/CoalitionTable';
import { BookAllocationDesk } from '../components/AllocationDesk';
import { formatMajorShort } from '../adapters/format';
import { ExitInspector } from '../components/workspace/ExitInspector';

const tabs = ['Shapley benchmark', 'Coalition costs', 'Exit check', 'Approvals', 'Audit history'] as const;

export function BookWorkspacePage() {
  const [search] = useSearchParams();
  return search.get('mode') === 'offline' ? <OfflineBookWorkspacePage /> : <LiveWorkspace />;
}

function LiveWorkspace() {
  const { owner, tag } = useParams();
  const wallet = useWallet();
  const id = `${owner?.toLowerCase()}:${tag}`;
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<(typeof tabs)[number]>(tabs[0]);

  async function refresh() {
    if (!wallet.sourceReady) return;
    setLoading(true);
    setError('');
    try {
      const result = await readBook(wallet.client, release.address!, id);
      if (!result) throw Error('Book not found in latest-final state');
      setBook(result);
    } catch (e) {
      setBook(null);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setBook(null);
    void refresh();
  }, [id, wallet.sourceReady]);

  async function act(intent: WriteIntent) {
    try {
      setError('');
      setBook((await wallet.send(intent)).book);
    } catch (e) {
      setError(String(e));
    }
  }

  const member = book?.input.members.some(m => m.address.toLowerCase() === wallet.signer?.toLowerCase());
  const split = book?.proof && 'charges' in book.proof ? book.proof : null;
  const selected = split?.selected_charges === undefined ? split?.charges : split.selected_charges;
  const digest = book?.allocation_hash;
  const transactions = wallet.entries.filter(e => e.pending?.bookId === id && e.contract.toLowerCase() === release.address?.toLowerCase());

  function exportBook() {
    const payload = { provenance:'LIVE_LATEST_FINAL', deployment:release, observedAt:new Date().toISOString(), book, transactions };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tag}-live.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="container live-studio">
    <header className="live-studio-header">
      <div>
        <Link to="/">← Split table</Link>
        <h1>{book?.input.title ?? 'Live quotation'}</h1>
      </div>
      <div className="live-studio-meta">
        <span className="badge">LATEST-FINAL · 61999</span>
        {book && <StatusBadge state={book.state} />}
      </div>
    </header>
    {loading && <p role="status">Reading latest-final state…</p>}
    {error && <p role="alert">{error}</p>}
    {book && <>
      <div className="live-studio-strip">
        <span>Revision {book.revision} · {book.input.currency} · {book.approvals.length}/{book.input.members.length} approvals</span>
        <div>
          <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => void refresh()}>Refresh Final State</button>
          <button className="btn btn-secondary btn-sm" onClick={exportBook}>Export final state</button>
        </div>
      </div>
      <BookAllocationDesk book={book} />
      <div className="live-studio-actions">
        {book.state === 'SEALED' && <button className="btn btn-primary" disabled={!member || wallet.busy} onClick={() => void act({ method:'assess', bookId:id, revision:book.revision })}>Assess with Consensus</button>}
        {book.state === 'READY' && selected?.length && digest &&
          <button className="btn btn-primary" disabled={!member || wallet.busy || book.approvals.some(a => a.toLowerCase() === wallet.signer?.toLowerCase())} onClick={() => {
            const amounts = selected.map((value, index) => `${book.input.members[index].name} ${formatMajorShort(value, book.input.currency)}`);
            if (window.confirm(`Approve ${amounts.join(', ')}?\nDigest ${digest}`))
              void act({ method:'approve', bookId:id, revision:book.revision, allocationHash:digest });
          }}>Approve Exact Allocation</button>}
        {!['COMMITTED', 'CANCELLED'].includes(book.state) &&
          <button className="btn btn-secondary" disabled={!member || wallet.busy} onClick={() => {
            if (window.confirm('Cancel this book permanently for every member?'))
              void act({ method:'cancel', bookId:id, revision:book.revision });
          }}>Cancel book</button>}
      </div>
      <details className="card card-padded live-quote">
        <summary>Sealed quotation and allocation digest</summary>
        <p className="mono">{id}</p>
        <blockquote>{book.input.quotation}</blockquote>
        <p className="mono">{digest ?? 'Awaiting assessment'}</p>
      </details>
      <div className="demo-tabs" role="group" aria-label="Inspect the book">
        {tabs.map(item => <button type="button" key={item} aria-pressed={tab === item} className="demo-tab" onClick={() => setTab(item)}>{item}</button>)}
      </div>
      <section className="card card-padded" aria-label={tab}>
        {tab === 'Shapley benchmark' && <><p>The original Shapley amounts provide a benchmark for the selected amounts in the split table.</p><ShapleyBreakdown book={book} /></>}
        {tab === 'Coalition costs' && <CoalitionTable book={book} />}
        {tab === 'Exit check' && <ExitInspector book={book} />}
        {tab === 'Approvals' && book.input.members.map(m => <p key={m.address} className="live-address">{m.name} · {m.address} · {book.approvals.includes(m.address) ? 'Approved' : 'Pending'}</p>)}
        {tab === 'Audit history' && <>
          <p>Operations recorded in this browser. The book above shows the latest-final chain state.</p>
          {transactions.map(entry => <p className="live-address" key={entry.id}><Link to={`/transactions/${entry.pending!.hash}`}>{entry.intent.method} · {entry.phase} · {entry.pending!.hash}</Link></p>)}
        </>}
      </section>
    </>}
  </div>;
}
