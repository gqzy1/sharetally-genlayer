import React,{useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useWallet} from '../app/WalletProvider';
import {OfflineTransactionPage} from './TransactionPage';
import {DEMO_TX_SCENARIOS,loadPendingWrites} from '../domain/txAdapter';
import {RELEASE_MANIFEST as release} from '../adapters/release';
export const TransactionPage:React.FC=()=>{
 const {hash}=useParams(),w=useWallet(),[error,setError]=useState('');
 const entry=w.entries.find(e=>e.pending?.hash.toLowerCase()===hash?.toLowerCase()&&e.contract.toLowerCase()===release.address?.toLowerCase());
 const resume=async()=>{if(entry)try{setError('');await w.resume(entry)}catch(e){setError(String(e))}};
 useEffect(()=>{if(entry?.pending&&!entry.verified&&!w.busy&&w.sourceReady&&entry.phase!=='FAILED')void resume()},[hash,w.sourceReady]);
 if(!entry&&loadPendingWrites().every(p=>p.hash.toLowerCase()!==hash?.toLowerCase())&&DEMO_TX_SCENARIOS.some(d=>d.hash===hash))return <OfflineTransactionPage/>;
 return <div className="container" style={{paddingBlock:'2rem'}}><div className="card card-padded"><h1 className="editorial-title">Live Transaction Verification</h1><p className="mono" style={{overflowWrap:'anywhere'}}>{hash}</p>
 {!entry?<p>No matching live intent saved. A hash alone cannot prove the expected method, signer, or readback. No receipt is reported as verified.</p>:<><p role="status">Phase: {entry.phase}</p><p>FINALIZED, execution SUCCESS, majority agreement, intent binding, and latest-final readback are separate checks. ACCEPTED is provisional.</p><p>{entry.error??error}</p><button className="btn btn-primary" disabled={w.busy||!!entry.verified||entry.phase==='FAILED'||!w.sourceReady} onClick={()=>void resume()}>Resume Original Hash</button><p>No transaction is sent by resume.</p>{entry.verified&&<><strong>VERIFIED · FINALIZED + SUCCESS + MAJORITY_AGREE + latest-final</strong><p>Readback: {entry.verified.book.state} · Revision {entry.verified.book.revision}</p><Link to={`/books/${entry.pending!.bookId.replace(':','/')}?mode=live`}>Open Latest Final Book</Link></>}<details><summary>Saved intent, receipt and readback</summary><pre style={{overflow:'auto',maxHeight:'30rem'}}>{JSON.stringify(entry,null,2)}</pre></details></>}
 </div></div>;
};
