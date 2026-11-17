/** Submits ONE selected operation; the operator supplies named member wallets separately. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createAccount,createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {ShareTallyApi} from '../sdk/client.js';
import type {Address,PendingWrite,WriteIntent} from '../sdk/types.js';
if(process.env.ENABLE_WRITE!=='STABLE_STUDIONET_61999')throw Error('Explicit ENABLE_WRITE=STABLE_STUDIONET_61999 required');
const [intentPath,journalPath]=process.argv.slice(2);
if(!intentPath||!journalPath||!journalPath.startsWith('artifacts/'))throw Error('Usage: npm run accept -- intent.json artifacts/unique-operation.json');
const key=process.env.STUDIO_PRIVATE_KEY;
if(!key||!/^0x[0-9a-fA-F]{64}$/.test(key))throw Error('Missing local STUDIO_PRIVATE_KEY');
const manifest=JSON.parse(await readFile('artifacts/deployment.json','utf8'));
if(manifest.chainId!==61999||manifest.rpc!=='https://studio.genlayer.com/api'||manifest.status!=='DEPLOYED')throw Error('Verified Stable deployment required');
const account=createAccount(key as `0x${string}`);
const api=new ShareTallyApi(createClient({chain:studionet,endpoint:manifest.rpc,account}),manifest.address,manifest.sourceSha256,account.address as Address);
await mkdir('artifacts',{recursive:true});
let saved:string|null=null;
try{saved=await readFile(journalPath,'utf8')}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}
let pending:PendingWrite;
if(saved){
  const journal=JSON.parse(saved);
  if(journal.kind==='verified-write'){console.log('Operation already verified; no transaction sent.');process.exit(0)}
  if(journal.kind==='submitting')throw Error('Submission outcome unknown. Reconcile wallet/chain before any retry.');
  pending=journal.pending;
}else{
  const intent=JSON.parse(await readFile(intentPath,'utf8')) as WriteIntent;
  // A crash between broadcast and hash persistence must never trigger a silent duplicate.
  await writeFile(journalPath,JSON.stringify({kind:'submitting',intent,signer:account.address},null,2)+'\n',{flag:'wx'});
  pending=await api.submit(intent);
  await writeFile(journalPath,JSON.stringify({kind:'pending-write',pending},null,2)+'\n');
}
const verified=await api.resume(pending,p=>console.log(p));
await writeFile(journalPath,JSON.stringify({kind:'verified-write',...verified},(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
console.log('Verified FINALIZED receipt and latest-final book saved.');
