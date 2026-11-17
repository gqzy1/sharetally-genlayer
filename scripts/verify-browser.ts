/** Read-only validation of hashes observed during actual application interaction. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {readClient,verifySource,readBook,receiptCall,checkReceipt,checkReadback} from '../sdk/client.js';
import {publicReceipt} from './receipts.js';
import type {Address,PendingWrite,Specification,TxHash,WriteIntent} from '../sdk/types.js';
import type {TransactionHash} from 'genlayer-js/types';
const inputPath=process.argv[2];if(!inputPath)throw Error('Usage: npm run verify:browser -- observed-hashes.json');
const observed=JSON.parse(await readFile(inputPath,'utf8'));
const manifest=JSON.parse(await readFile('deployment.json','utf8'));
const owner=String(observed.owner).toLowerCase() as Address,member=String(observed.member).toLowerCase() as Address;
if(!/^0x[0-9a-f]{40}$/.test(owner)||!/^0x[0-9a-f]{40}$/.test(member)||owner===member)throw Error('Distinct observed wallet addresses required');
if(manifest.chainId!==61999||manifest.rpc!=='https://studio.genlayer.com/api'||manifest.sdk!=='genlayer-js@1.1.8'||manifest.status!=='DEPLOYED')throw Error('Incorrect release');
const client=readClient(),actualSha256=await verifySource(client,manifest.address,manifest.sourceSha256);
const bookId=owner+':'+observed.bookTag,cancelId=owner+':'+observed.cancelTag;
const book=await readBook(client,manifest.address,bookId),cancelled=await readBook(client,manifest.address,cancelId);
if(book?.state!=='COMMITTED'||book.approvals.length!==2||!book.approvals.includes(owner)||!book.approvals.includes(member))throw Error('Browser book has not committed independent approvals');
if(cancelled?.state!=='CANCELLED'||cancelled.cancelled_by!==member)throw Error('Browser member cancellation missing');
const operations=[];
for(const [name,method,signer,id,revision] of [
 ['seal','seal',owner,bookId,0],['assess','assess',owner,bookId,0],
 ['approveOwner','approve',owner,bookId,1],['approveMember','approve',member,bookId,2],
 ['sealCancel','seal',owner,cancelId,0],['cancel','cancel',member,cancelId,0]
] as const){
 const hash=observed.hashes[name] as TxHash;if(!/^0x[0-9a-fA-F]{64}$/.test(hash))throw Error('Missing observed hash '+name);
 const receipt=await client.getTransaction({hash:hash as TransactionHash});
 let intent:WriteIntent;
 if(method==='seal'){
  const call=receiptCall(receipt),args=call.args;if(!Array.isArray(args)||args.length!==2||args[0]!==id.split(':')[1]||typeof args[1]!=='string')throw Error('Observed seal calldata mismatch');
  const specification=JSON.parse(args[1]) as Specification;
  if(specification.members.length!==2||specification.members[0].address.toLowerCase()!==owner||specification.members[1].address.toLowerCase()!==member)throw Error('Observed roster mismatch');
  intent={method,tag:args[0],specification};
 }else if(method==='approve')intent={method,bookId:id,revision,allocationHash:book.allocation_hash!};
 else intent={method,bookId:id,revision};
 const pending:PendingWrite={hash,contract:manifest.address,signer,bookId:id,intent,submittedAt:String((receipt as any).created_at??'')};
 checkReceipt(receipt,pending);checkReadback(id===bookId?book:cancelled,pending);
 operations.push({name,pending,receipt:publicReceipt(receipt),book:id===bookId?book:cancelled,variant:'latest-final',verifiedAt:new Date().toISOString()});
}
await mkdir('evidence',{recursive:true});
const result={kind:'real-published-browser-acceptance',site:observed.site,chainId:61999,rpc:manifest.rpc,contract:manifest.address,sourceSha256:actualSha256,owner,member,bookId,cancelId,operations,finalBook:book,cancelledBook:cancelled,verifiedAt:new Date().toISOString(),verification:'Actual browser-observed hashes refetched and checked read-only; no transactions sent by this script.'};
await writeFile('evidence/browser-live.json',JSON.stringify(result,null,2)+'\n');console.log('Six real browser-observed operations verified, including distinct approvals and member cancellation.');
