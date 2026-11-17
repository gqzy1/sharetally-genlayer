import React,{useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import type {Book,WriteIntent} from '../../../sdk/types';
import {readBook} from '../../../sdk/client';
import {useWallet} from '../app/WalletProvider';
import {RELEASE_MANIFEST as release} from '../adapters/release';
import {OfflineBookWorkspacePage} from './BookWorkspacePage';
import {StatusBadge} from '../components/StatusBadge';
import {ShapleyBreakdown} from '../components/workspace/ShapleyBreakdown';
import {CoalitionTable} from '../components/workspace/CoalitionTable';
import {ExitInspector} from '../components/workspace/ExitInspector';
export const BookWorkspacePage:React.FC=()=>{
 const [search]=useSearchParams();return search.get('mode')==='offline'?<OfflineBookWorkspacePage/>:<LiveWorkspace/>;
};
function LiveWorkspace(){
 const {owner,tag}=useParams(),w=useWallet(),id=`${owner?.toLowerCase()}:${tag}`;
 const [book,setBook]=useState<Book|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[tab,setTab]=useState('Shapley Split');
 const refresh=async()=>{setLoading(true);setError('');try{if(!w.sourceReady)throw Error('Source verification required');const b=await readBook(w.client,release.address!,id);if(!b)throw Error('Book not found in latest-final state');setBook(b)}catch(e){setBook(null);setError(String(e))}finally{setLoading(false)}};
 useEffect(()=>{void refresh()},[id,w.sourceReady]);
 const act=async(intent:WriteIntent)=>{try{setError('');const result=await w.send(intent);setBook(result.book)}catch(e){setError(String(e))}};
 const member=book?.input.members.some(m=>m.address.toLowerCase()===w.signer?.toLowerCase());
 const transactions=w.entries.filter(e=>e.pending?.bookId===id&&e.contract.toLowerCase()===release.address?.toLowerCase());
 return <div className="container" style={{paddingBlock:'2.5rem 4rem'}}>
 <div className="card card-padded"><span className="badge">LIVE · latest-final · 61999</span><h1 className="editorial-title">{book?.input.title??'Live Quotation'}</h1><p className="mono" style={{overflowWrap:'anywhere'}}>{id}</p><button className="btn btn-secondary btn-sm" disabled={loading||!w.sourceReady} onClick={()=>void refresh()}>Refresh Final State</button>
 {loading&&<p role="status">Reading latest-final state…</p>}{error&&<p role="alert">{error} · No offline fallback.</p>}
 {book&&<><StatusBadge state={book.state}/><p>Revision {book.revision} · {book.input.currency} · {book.approvals.length}/{book.input.members.length} approvals</p><blockquote>{book.input.quotation}</blockquote><p className="mono" style={{overflowWrap:'anywhere'}}>Allocation digest: {book.allocation_hash??'Not assessed'}</p>
 <div style={{display:'flex',gap:'.6rem',flexWrap:'wrap',marginBlock:'1rem'}}>
 {book.state==='SEALED'&&<button className="btn btn-primary" disabled={!member||w.busy} onClick={()=>void act({method:'assess',bookId:id,revision:book.revision})}>Assess with Consensus</button>}
 {book.state==='READY'&&<button className="btn btn-primary" disabled={!member||w.busy||book.approvals.some(a=>a.toLowerCase()===w.signer?.toLowerCase())} onClick={()=>{if(window.confirm(`Approve this exact allocation digest? ${book.allocation_hash}`))void act({method:'approve',bookId:id,revision:book.revision,allocationHash:book.allocation_hash!})}}>Approve Exact Allocation</button>}
 {!['COMMITTED','CANCELLED'].includes(book.state)&&<button className="btn btn-secondary" disabled={!member||w.busy} onClick={()=>{if(window.confirm('Cancel this book permanently for every member?'))void act({method:'cancel',bookId:id,revision:book.revision})}}>Cancel Book</button>}
 <button className="btn btn-secondary" onClick={()=>{const blob=new Blob([JSON.stringify({provenance:'LIVE_LATEST_FINAL',deployment:release,observedAt:new Date().toISOString(),book,transactions},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`${tag}-live.json`;a.click();URL.revokeObjectURL(u)}}>Export Final State</button></div>
 <p>Only named wallets may act. Each independent wallet approves the same digest; COMMITTED requires every member.</p></>}
 </div>
 {book&&<><div className="demo-tabs" role="tablist">{['Shapley Split','Coalition Costs','Exit Check','Approvals','Audit History'].map(t=><button key={t} role="tab" aria-selected={tab===t} className="demo-tab" onClick={()=>setTab(t)}>{t}</button>)}</div><div className="card card-padded">
 {tab==='Shapley Split'&&<ShapleyBreakdown book={book}/>}{tab==='Coalition Costs'&&<CoalitionTable book={book}/>}{tab==='Exit Check'&&<ExitInspector book={book}/>}
 {tab==='Approvals'&&book.input.members.map(m=><p key={m.address} style={{overflowWrap:'anywhere'}}>{m.name} · {m.address} · {book.approvals.includes(m.address)?'Approved':'Pending'}</p>)}
 {tab==='Audit History'&&<><p>Real operations recorded in this browser. This is not a complete global event index; the book above is authoritative latest-final state.</p>{transactions.map(e=><p key={e.id}><Link to={`/transactions/${e.pending!.hash}`}>{e.intent.method} · {e.phase} · {e.pending!.hash}</Link></p>)}</>}
 </div></>}
 </div>;
}
