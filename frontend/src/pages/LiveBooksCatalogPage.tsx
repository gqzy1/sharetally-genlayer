import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Book, Address } from '../../../sdk/types';
import { listBooks, readBook } from '../../../sdk/client';
import { useWallet } from '../app/WalletProvider';
import { RELEASE_MANIFEST as release } from '../adapters/release';
import { parseBookInvitation, isValidAddress } from '../domain/validation';
import { OfflineBooksCatalogPage } from './BooksCatalogPage';
export const BooksCatalogPage: React.FC = () => { const [s] = useSearchParams(); return s.get('mode') === 'offline' ? <><div className="container"><Link to="/books">Switch to Live Catalogue</Link></div><OfflineBooksCatalogPage /></> : <LiveCatalogue />; };
function LiveCatalogue() {
    const w = useWallet(), navigate = useNavigate(), [owner, setOwner] = useState(''), [invitation, setInvitation] = useState(''), [items, setItems] = useState<Book[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(false), [loaded, setLoaded] = useState(false);
    const lookup = async () => { setItems([]); setLoaded(false); setError(''); setLoading(true); try {
        if (!w.sourceReady)
            throw Error('Verify source before live lookup');
        if (!isValidAddress(owner))
            throw Error('Enter a valid organizer address');
        const ids = await listBooks(w.client, release.address!, owner.toLowerCase() as Address);
        const books = await Promise.all(ids.map(id => readBook(w.client, release.address!, id)));
        if (books.some(b => !b))
            throw Error('Incomplete catalogue read; try again');
        setItems(books as Book[]);
        setLoaded(true);
    }
    catch (e) {
        setError(String(e));
    }
    finally {
        setLoading(false);
    } };
    return <div className="container" style={{ paddingBlock: '2.5rem 4rem' }}><h1 className="editorial-title">Live Book Catalogue</h1><p>Stable Studionet · latest-final · Source verified before reads. Failed reads never display fixtures.</p><Link to="/books?mode=offline">Open Explicit Offline Catalogue</Link>
 <div className="form-grid-2" style={{ marginBlock: '1.5rem' }}><form className="card card-padded" onSubmit={e => { e.preventDefault(); const p = parseBookInvitation(invitation); if (p.ok)
        navigate(`/books/${p.owner}/${p.tag}?mode=live`);
    else
        setError(p.error); }}><label htmlFor="invitation">Owner-qualified book ID or link</label><input id="invitation" className="input" value={invitation} onChange={e => setInvitation(e.target.value)}/><button className="btn btn-primary">Open Book</button></form>
 <form className="card card-padded" onSubmit={e => { e.preventDefault(); void lookup(); }}><label htmlFor="owner">Organizer wallet address</label><input id="owner" className="input mono" value={owner} onChange={e => setOwner(e.target.value)}/><button type="button" className="btn btn-secondary" disabled={!w.signer} onClick={() => setOwner(w.signer!)}>Use Connected Wallet</button><button className="btn btn-primary" disabled={loading || !w.sourceReady}>Query Final Catalogue</button></form></div>
 {loading && <p role="status">Reading latest-final catalogue…</p>}{error && <p role="alert">{error} · No offline fallback.</p>}{loaded && items.length === 0 && <p>No books found for this organizer.</p>}
 {items.map(b => <div className="card card-padded" key={b.id}><h2>{b.input.title}</h2><p>{b.state} · Revision {b.revision}</p><Link className="btn btn-secondary" to={`/books/${b.id.replace(':', '/')}?mode=live`}>Open Live Book</Link></div>)}</div>;
}
