/** Zero-cost acceptance against the verified Stable release. Local keys never enter evidence. */
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createAccount,createClient,generatePrivateKey} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {ShareTallyApi,checkReceipt,checkIntentBinding,receiptStatus,verifySource} from '../sdk/client.js';
import type {Address,Book,PendingWrite,WriteIntent} from '../sdk/types.js';
if(process.env.ENABLE_WRITE!=='STABLE_STUDIONET_61999')throw Error('Explicit Stable acceptance opt-in required');
const stringify=(v:unknown)=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x,2)+'\n';
const load=async(p:string,fallback:any=null)=>{try{return JSON.parse(await readFile(p,'utf8'))}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return fallback;throw e}};
const save=async(p:string,v:unknown)=>{await writeFile(p+'.tmp',stringify(v));await rename(p+'.tmp',p)};
export function publicReceipt(r:any){
 const selected:any=Object.fromEntries(['hash','from_address','to_address','status','statusName','result','resultName','leader_only','execution_mode','value','txExecutionResultName','txDataDecoded'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
 selected.data={...r.data};delete selected.data.contract_code;
 const leaders=r.consensus_data?.leader_receipt;
 if(r.consensus_data)selected.consensus_data={votes:r.consensus_data.votes,leader_receipt:(Array.isArray(leaders)?leaders:leaders?[leaders]:[]).map((x:any)=>Object.fromEntries(['mode','vote','execution_result','genvm_result','result','eq_outputs'].filter(k=>x[k]!==undefined).map(k=>[k,x[k]])))};
 return selected;
}
await mkdir('.local',{recursive:true,mode:0o700});await mkdir('evidence/receipts',{recursive:true});
let keys=await load('.local/actors.json');if(!keys){keys=Object.fromEntries(['owner','member','outsider'].map(x=>[x,generatePrivateKey()]));await writeFile('.local/actors.json',stringify(keys),{mode:0o600,flag:'wx'})}
const deployment=await load('artifacts/deployment.json');
if(!deployment||deployment.status!=='DEPLOYED'||deployment.chainId!==61999||deployment.rpc!=='https://studio.genlayer.com/api')throw Error('Run deploy and verify first');
const actors=Object.fromEntries(Object.entries(keys).map(([name,key])=>{const account=createAccount(key as `0x${string}`);return [name,{address:account.address.toLowerCase() as Address,client:createClient({chain:studionet,endpoint:deployment.rpc,account})}]}));
const owner=actors.owner.address,member=actors.member.address;
const api=(actor:string)=>new ShareTallyApi(actors[actor].client,deployment.address,deployment.sourceSha256,actors[actor].address);
await verifySource(actors.owner.client,deployment.address,deployment.sourceSha256);
const localHash=createHash('sha256').update(await readFile('contracts/sharetally.py')).digest('hex');if(localHash!==deployment.sourceSha256)throw Error('Local source mismatch');
const evidence=await load('evidence/live.json',{kind:'real-stable-studionet-acceptance',deployment,actors:Object.fromEntries(Object.entries(actors).map(([n,a])=>[n,a.address])),operations:[]});
if(evidence.deployment.address!==deployment.address||evidence.actors.owner!==owner)throw Error('Existing acceptance belongs to another release or signer');
async function step(name:string,actor:string,intent:WriteIntent,expectedError?:string):Promise<Book>{
 let entry=evidence.operations.find((x:any)=>x.name===name);
 if(entry?.verified)return entry.book;
 const clientApi=api(actor);
 if(!entry){entry={name,intent,signer:actors[actor].address,phase:'SUBMITTING',expectedError,before:intent.method==='seal'?null:await clientApi.getBook(intent.bookId)};evidence.operations.push(entry);await save('evidence/live.json',evidence);entry.pending=await clientApi.submit(intent);entry.phase='SUBMITTED';await save('evidence/live.json',evidence)}
 if(!entry.pending)throw Error('Unknown broadcast outcome; reconcile original signer');
 const pending=entry.pending as PendingWrite;
 if(expectedError){
  let r:any;for(let i=0;i<180;i++){r=await actors[actor].client.getTransaction({hash:pending.hash as import('genlayer-js/types').TransactionHash});if(receiptStatus(r)==='FINALIZED')break;console.log(name,receiptStatus(r));await new Promise(r=>setTimeout(r,5000))}
  if(receiptStatus(r)!=='FINALIZED')throw Error('Negative call not finalized; resume original hash');
  let rejected=false;try{checkReceipt(r,pending)}catch(e){rejected=(e as {code?:string}).code==='TX_FAILED'}
  checkIntentBinding(r,pending);
  if(!rejected||!stringify(r).includes(expectedError)||r.result!==6||r.leader_only!==false||r.execution_mode!=='NORMAL')throw Error('Failure did not match expected consensus-backed rejection');
  const book=await clientApi.getBook(pending.bookId);if(stringify(book)!==stringify(entry.before))throw Error('Rejected operation changed state');
  entry.receipt=publicReceipt(r);entry.book=book;entry.rejectionVerified=true;
 }else{
  // Exercise timeout recovery once, without a second broadcast.
  if(name==='seal-main'&&!entry.timeoutChecked){try{await clientApi.resume(pending,()=>{},0)}catch(e){if((e as {code?:string}).code!=='WAIT_TIMEOUT')throw e;entry.timeoutChecked={hash:pending.hash,code:'WAIT_TIMEOUT',resubmitted:false};await save('evidence/live.json',evidence)}}
  const verified=await clientApi.resume(pending,p=>console.log(name,p));entry.receipt=publicReceipt(verified.receipt);entry.book=verified.book;entry.variant=verified.variant;entry.verifiedAt=verified.verifiedAt;
 }
 entry.phase=expectedError?'EXPECTED_REJECTION':'VERIFIED';entry.verified=true;await save(`evidence/receipts/${name}.json`,entry.receipt);await save('evidence/live.json',evidence);return entry.book;
}
const specification={title:'Shared print setup',currency:'GBP' as const,quotation:'The total price is 120 minor units per nonempty group, plus 30 minor units per member. No other fees apply.',source_locator:'Acceptance quotation; supplier identity is not independently authenticated.',members:[{name:'Ada',address:owner,description:'One identical print order'},{name:'Bo',address:member,description:'One identical print order'}]};
const id=owner+':print-setup';
await step('seal-main','owner',{method:'seal',tag:'print-setup',specification});
let book=await step('assess-main','owner',{method:'assess',bookId:id,revision:0});if(book.state!=='READY')throw Error('Expected READY main allocation');
await step('reject-outsider','outsider',{method:'approve',bookId:id,revision:1,allocationHash:book.allocation_hash!},'MEMBER_ONLY');
await step('approve-owner','owner',{method:'approve',bookId:id,revision:1,allocationHash:book.allocation_hash!});
await step('reject-duplicate','owner',{method:'approve',bookId:id,revision:2,allocationHash:book.allocation_hash!},'ALREADY_APPROVED');
book=await step('approve-member','member',{method:'approve',bookId:id,revision:2,allocationHash:book.allocation_hash!});if(book.state!=='COMMITTED'||book.approvals.length!==2)throw Error('Missing independent commitment');
await step('reject-terminal','member',{method:'cancel',bookId:id,revision:3},'TERMINAL');
await step('seal-cancel','owner',{method:'seal',tag:'cancel-example',specification:{...specification,title:'Cancellation example'}});
const cancelled=await step('cancel','member',{method:'cancel',bookId:owner+':cancel-example',revision:0});if(cancelled.state!=='CANCELLED')throw Error('Cancellation missing');
for(const [tag,quote,wanted] of [
 ['review-example','Pricing is 100 minor units per member. A mandatory setup charge applies but its amount has not been specified.','REVIEW'],
 ['blocked-example','For exactly one member the complete total is 300 minor units. For exactly two members the complete total is 200 minor units. No other fees apply.','BLOCKED']
]){
 await step('seal-'+tag,'owner',{method:'seal',tag,specification:{...specification,title:tag,quotation:quote}});
 const b=await step('assess-'+tag,'owner',{method:'assess',bookId:owner+':'+tag,revision:0});if(b.state!==wanted)throw Error(`Expected ${wanted}, got ${b.state}`);
}
const deployedReceipt=await load('artifacts/deployment-receipt.json');await save('evidence/receipts/deploy.json',publicReceipt(deployedReceipt));
evidence.completedAt=new Date().toISOString();evidence.finalBook=await api('owner').getBook(id);evidence.sourceVerification={localSha256:localHash,onchainSha256:deployment.sourceSha256,match:true,verifiedAt:new Date().toISOString()};
await save('evidence/live.json',evidence);await save('deployment.json',deployment);console.log('Real Stable acceptance complete',deployment.address);
