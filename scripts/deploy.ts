/** Explicit operator action only. No deployment runs as part of tests or schema checks. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createAccount,createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionStatus,type TransactionHash} from 'genlayer-js/types';
import {assertNetwork,studioFees,checkFinalReceipt,verifySource} from '../sdk/client.js';
import type {Address,TxHash} from '../sdk/types.js';

if(process.env.ENABLE_DEPLOY!=='STABLE_STUDIONET_61999')throw Error('Set ENABLE_DEPLOY=STABLE_STUDIONET_61999 for a deliberate deployment');
const key=process.env.STUDIO_PRIVATE_KEY;
if(!key||!/^0x[0-9a-fA-F]{64}$/.test(key))throw Error('Set STUDIO_PRIVATE_KEY locally; never commit it');
const client=createClient({chain:studionet,endpoint:'https://studio.genlayer.com/api',account:createAccount(key as `0x${string}`)});
await assertNetwork(client);
await mkdir('artifacts',{recursive:true});
const file='artifacts/deployment-pending.json';
let pending:{hash:TxHash;sourceSha256:string};
const source=await readFile('contracts/sharetally.py');
const sourceSha256=createHash('sha256').update(source).digest('hex');
let previous:string|null=null;
try{previous=await readFile(file,'utf8')}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}
if(previous){const saved=JSON.parse(previous);if(saved.kind==='submitting')throw Error('Deployment broadcast outcome unknown; reconcile wallet before retry');pending=saved;if(pending.sourceSha256!==sourceSha256)throw Error('Pending deployment uses another source; reconcile it first')}
else{
  const fees=await studioFees(client);
  await writeFile(file,JSON.stringify({kind:'submitting',sourceSha256},null,2)+'\n',{flag:'wx'});
  const hash=await client.deployContract({code:source,args:[],leaderOnly:false,...(fees?{fees}:{})});
  pending={hash,sourceSha256};await writeFile(file,JSON.stringify(pending,null,2)+'\n');
}
// Restarting resumes this same hash; no automatic re-deploy on timeout or failure.
await client.waitForTransactionReceipt({hash:pending.hash as TransactionHash,status:TransactionStatus.FINALIZED,interval:5000,retries:180});
const receipt=await client.getTransaction({hash:pending.hash as TransactionHash});
await writeFile('artifacts/deployment-receipt.json',JSON.stringify(receipt,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
checkFinalReceipt(receipt,pending.hash);
const r=receipt as unknown as Record<string,any>;
if(String(r.from_address??r.sender).toLowerCase()!==client.account!.address.toLowerCase())throw Error('Deployment signer mismatch');
const address=(r.data?.contract_address??r.txDataDecoded?.contractAddress??r.to_address??r.recipient) as Address;
await verifySource(client,address,sourceSha256);
const manifest={protocol:'sharetally-2',status:'DEPLOYED',chainId:61999,rpc:'https://studio.genlayer.com/api',sdk:'genlayer-js@2.0.0-rc.3',address,sourceSha256,deployTransaction:pending.hash};
await writeFile('artifacts/deployment.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Verified deployment written to artifacts/deployment.json');
