import {test} from 'node:test';
import assert from 'node:assert/strict';
import {abi} from 'genlayer-js';
import {ShareTallyApi,argsFor,checkReceipt,checkReadback,parseJson} from '../sdk/client.js';
import type {Client} from '../sdk/client.js';
import type {Book,PendingWrite,TxHash} from '../sdk/types.js';
const hash=('0x'+'a'.repeat(64)) as TxHash;
const signer='0x1111111111111111111111111111111111111111';
const contract='0x2222222222222222222222222222222222222222';
const pending:PendingWrite={hash,signer,contract,bookId:signer+':sample',submittedAt:'2026-11-18T00:00:00Z',intent:{method:'approve',bookId:signer+':sample',revision:1,allocationHash:'a'.repeat(64)}};
function receipt(){return {hash,from_address:signer,to_address:contract,statusName:'FINALIZED',leader_only:false,execution_mode:'NORMAL',result:6,
  consensus_data:{leader_receipt:[{mode:'leader',execution_result:'SUCCESS'}]},
  data:{calldata:{base64:Buffer.from(abi.calldata.encode({method:pending.intent.method,args:argsFor(pending.intent)})).toString('base64')}}}}
function book():Book{return {id:pending.bookId,owner:signer,input:{title:'Test',currency:'GBP',quotation:'A bounded quotation.',source_locator:'',members:[]},input_hash:'x',revision:2,state:'READY',approvals:[signer],allocation_hash:'a'.repeat(64)}}

test('Stable Studionet receipt validates real SDK encoded calldata',()=>assert.doesNotThrow(()=>checkReceipt(receipt(),pending)));
test('provisional, failure, majority, signer, destination, hash, consensus and calldata are checked',()=>{
  const mutators=[(r:any)=>r.statusName='ACCEPTED',(r:any)=>r.hash='0x'+'b'.repeat(64),(r:any)=>r.from_address=contract,
    (r:any)=>r.to_address=signer,(r:any)=>r.result=7,(r:any)=>r.leader_only=true,(r:any)=>r.execution_mode='LEADER_ONLY',
    (r:any)=>r.consensus_data.leader_receipt[0].execution_result='ERROR',(r:any)=>r.consensus_data.leader_receipt=[],
    (r:any)=>r.data.calldata.base64='invalid',(r:any)=>r.value=1,
    (r:any)=>r.data.calldata.base64=Buffer.from(abi.calldata.encode({method:'cancel',args:argsFor(pending.intent)})).toString('base64')];
  for(const change of mutators){const r=receipt();change(r);assert.throws(()=>checkReceipt(r,pending))}
});
test('modern SDK receipt also fails closed on missing consensus',()=>{
  const r={hash,sender:signer,recipient:contract,statusName:'FINALIZED',txExecutionResultName:'FINISHED_WITH_RETURN',resultName:'MAJORITY_AGREE',txDataDecoded:{leaderOnly:false,callData:{method:pending.intent.method,args:argsFor(pending.intent)}}};
  assert.doesNotThrow(()=>checkReceipt(r,pending));r.resultName='NO_MAJORITY';assert.throws(()=>checkReceipt(r,pending));
});
test('readback verifies revision, hash and signed member even after concurrent later approval',()=>{
  assert.doesNotThrow(()=>checkReadback(book(),pending));
  const b=book();b.revision=3;b.state='COMMITTED';assert.doesNotThrow(()=>checkReadback(b,pending));
  for(const change of [(v:Book)=>v.revision=1,(v:Book)=>v.approvals=[],(v:Book)=>v.allocation_hash='wrong',(v:Book)=>v.id='other']){
    const v=book();change(v);assert.throws(()=>checkReadback(v,pending));
  }
  assert.throws(()=>checkReadback(null,pending));
});
test('resume polls the SAME hash, accepts only finalized success plus latest-final read',async()=>{
  let polls=0,reads=0;const phases:string[]=[];
  const client={getChainId:async()=>61999,getTransaction:async({hash:h}:{hash:string})=>{assert.equal(h,hash);polls++;return {...receipt(),statusName:polls===1?'ACCEPTED':'FINALIZED'}},
    readContract:async(args:any)=>{reads++;assert.equal(args.transactionHashVariant,'latest-final');assert.equal(args.functionName,'get_book');return JSON.stringify(book())}} as unknown as Client;
  const api=new ShareTallyApi(client,contract,'',signer);
  const result=await api.resume(pending,p=>phases.push(p),1000,0);
  assert.equal(polls,2);assert.equal(reads,1);assert.equal(result.variant,'latest-final');assert.deepEqual(phases,['ACCEPTED','READING_BACK','VERIFIED']);
});
test('timeout and network failure never submit another write',async()=>{
  let writes=0;
  const client={getChainId:async()=>61999,writeContract:async()=>writes++,getTransaction:async()=>({...receipt(),statusName:'ACCEPTED'})} as unknown as Client;
  const api=new ShareTallyApi(client,contract,'',signer);
  await assert.rejects(api.resume(pending,()=>{},0,0),/retain this hash/);assert.equal(writes,0);
  const bad={...client,getChainId:async()=>1} as Client;
  await assert.rejects(new ShareTallyApi(bad,contract,'',signer).resume(pending),/61999/);
});
test('readback distinguishes unsuccessful assessment from successful transaction',()=>{
  const p={...pending,intent:{method:'assess',bookId:pending.bookId,revision:0}} as PendingWrite;
  const b=book();b.state='BLOCKED';b.accepted={rows:[]};b.proof={status:'BLOCKED',nonmonotone:[]};assert.doesNotThrow(()=>checkReadback(b,p));
});
test('JSON response and argument serialization reject invalid data',()=>{
  assert.throws(()=>parseJson({}));assert.throws(()=>parseJson('not json'));
  assert.deepEqual(argsFor({method:'cancel',bookId:'book',revision:3}),['book',3]);
});

test('wallet guard rechecks the actual provider network and account immediately before signing',async()=>{
  const {guardedProvider}=await import('../sdk/client.js');
  let chain='0xf22f',account=signer,signed=0;
  const provider={request:async({method}:{method:string})=>method==='eth_chainId'?chain:method==='eth_accounts'?[account]:(signed++,'sent')};
  const guarded=guardedProvider(provider as never,signer);
  assert.equal(await guarded.request({method:'eth_sendTransaction',params:[{value:'0x0',gasPrice:'0x0'}]}), 'sent');
  chain='0x1';await assert.rejects(guarded.request({method:'eth_sendTransaction',params:[{value:'0x0',gasPrice:'0x0'}]}),/Stable Studionet/);
  chain='0xf22f';account=contract;await assert.rejects(guarded.request({method:'eth_sendTransaction',params:[{value:'0x0',gasPrice:'0x0'}]}),/account changed/);
  assert.equal(signed,1);
});

test('SDK numeric receipt status uses official mapping and never promotes ACCEPTED',async()=>{
 const {checkFinalReceipt,receiptStatus}=await import('../sdk/client.js');
 const r={...receipt(),statusName:undefined,status:7};assert.equal(receiptStatus(r),'FINALIZED');assert.doesNotThrow(()=>checkFinalReceipt(r,hash));
 r.status=5;assert.equal(receiptStatus(r),'ACCEPTED');assert.throws(()=>checkFinalReceipt(r,hash));
});
test('nonzero gas price stops zero-cost writes',async()=>{
 const {assertZeroCost}=await import('../sdk/client.js');
 const client={getChainId:async()=>61999,request:async()=> '0x1'} as unknown as Client;
 await assert.rejects(assertZeroCost(client),/requires payment/);
});
