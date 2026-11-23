import {createClient,abi} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant,transactionsStatusNumberToName} from 'genlayer-js/types';
import type {Address, Book, PendingWrite, Specification, TxHash, TxPhase, VerifiedWrite, WriteIntent} from './types.js';
import {ShareTallyError} from './types.js';

export const CHAIN_ID=61999;
export const RPC='https://studio.genlayer.com/api';
export type Client=ReturnType<typeof createClient>;
export type Provider=NonNullable<Parameters<typeof createClient>[0]>['provider'];
function fail(code: ConstructorParameters<typeof ShareTallyError>[0], message: string, hash?: TxHash): never {throw new ShareTallyError(code,message,hash)}
const obj=(v: unknown): Record<string,unknown>=>v instanceof Map?Object.fromEntries(v):v!==null&&typeof v==='object'?v as Record<string,unknown>:{};
const lower=(v:unknown)=>typeof v==='string'?v.toLowerCase():'';
export function parseJson<T>(value: unknown): T {
  if(typeof value!=='string')return fail('BAD_RESPONSE','Expected the contract JSON string');
  try{return JSON.parse(value) as T}catch{return fail('BAD_RESPONSE','Invalid contract JSON')}
}
export function readClient():Client{return createClient({chain:studionet,endpoint:RPC})}
export async function assertNetwork(client:Client):Promise<void>{
  if(studionet.id!==CHAIN_ID || await client.getChainId()!==CHAIN_ID)fail('WRONG_NETWORK','Stable Studionet 61999 required');
}
/** Require zero EVM gas price. The separate consensus fee is capped by studioFees. */
export async function assertZeroCost(client:Client):Promise<void>{
  await assertNetwork(client);
  const gasPrice = await client.request({method:'eth_gasPrice'});
  if(BigInt(gasPrice as string)!==0n)fail('REJECTED','Expected zero EVM gas price; no transaction sent');
}
const MAX_STUDIO_FEE = 10000000000000000n;
export async function studioFees(client:Client) {
  await assertZeroCost(client);
  const config = await client.request({method:'sim_getFeeConfig'} as never) as {
    enabled: boolean;
    defaultFees: {distribution: NonNullable<Parameters<Client['deployContract']>[0]['fees']>['distribution'];feeValue:string};
  };
  if(!config.enabled) return undefined;
  const feeValue = BigInt(config.defaultFees.feeValue);
  if(feeValue <= 0n || feeValue > MAX_STUDIO_FEE)fail('REJECTED','Stable testnet fee exceeds the configured cap');
  return {distribution:config.defaultFees.distribution,feeValue};
}
export function guardedProvider(provider:NonNullable<Provider>,signer:Address):NonNullable<Provider>{
  return new Proxy(provider, {get(target,property){
    if(property==='request')return async (request:Parameters<typeof provider.request>[0])=>{
      if(['eth_sendTransaction','eth_signTransaction','personal_sign','eth_signTypedData_v4'].includes(request.method)){
        if(Number(await target.request({method:'eth_chainId'}))!==CHAIN_ID)fail('WRONG_NETWORK','Wallet moved off Stable Studionet');
        const tx=(request.params as Record<string,unknown>[]|undefined)?.[0];
        if(request.method==='eth_sendTransaction' && (!tx || (BigInt(String(tx.value??0))<0n||BigInt(String(tx.value??0))>MAX_STUDIO_FEE) || BigInt(String(tx.gasPrice??-1))!==0n))fail('REJECTED','Only capped Stable testnet fees with zero gas price are permitted');
        const accounts=await target.request({method:'eth_accounts'}) as string[];
        if(lower(accounts[0])!==lower(signer))fail('SIGNER_CHANGED','Wallet account changed before signing');
      }
      return target.request(request);
    };
    const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
  }});
}
export async function connectWallet(provider: NonNullable<Provider>):Promise<{client:Client;signer:Address}>{
  await provider.request({method:'eth_requestAccounts'});
  try {await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xf22f'}]})}
  catch(e){
    if(obj(e).code!==4902)throw e;
    await provider.request({method:'wallet_addEthereumChain',params:[{chainId:'0xf22f',chainName:'GenLayer Stable Studionet',
      nativeCurrency:studionet.nativeCurrency,rpcUrls:[RPC],blockExplorerUrls:[studionet.blockExplorers!.default.url]}]});
    await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xf22f'}]});
  }
  if(Number(await provider.request({method:'eth_chainId'}))!==CHAIN_ID)fail('WRONG_NETWORK','Wallet network differs');
  const accounts=await provider.request({method:'eth_accounts'}) as Address[];
  if(!accounts[0])fail('REJECTED','No wallet account');
  return {client:createClient({chain:studionet,endpoint:RPC,provider:guardedProvider(provider,accounts[0]),account:accounts[0]}),signer:accounts[0]};
}
export async function readBook(client:Client,contract:Address,id:string):Promise<Book|null>{
  const raw=await client.readContract({address:contract,functionName:'get_book',args:[id],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
  if(raw==='')return null;
  const book=parseJson<Book>(raw);
  if(book.id!==id || !Number.isInteger(book.revision) || !Array.isArray(book.approvals) || !book.input ||
      !['SEALED','REVIEW','BLOCKED','READY','COMMITTED','CANCELLED'].includes(book.state))fail('BAD_RESPONSE','Invalid book envelope');
  return book;
}
export async function listBooks(client:Client,contract:Address,owner:Address):Promise<string[]>{
  const ids=parseJson<unknown>(await client.readContract({address:contract,functionName:'list_books',args:[owner],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));
  if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'))return fail('BAD_RESPONSE','Invalid book catalogue');
  return ids as string[];
}
export async function verifySource(client:Client,contract:Address,expectedSha256:string):Promise<string>{
  await assertNetwork(client);
  if(!/^0x[0-9a-fA-F]{40}$/.test(contract)||/^0x0{40}$/i.test(contract))fail('NOT_DEPLOYED','No deployed contract configured');
  if(!/^[0-9a-f]{64}$/.test(expectedSha256))fail('SOURCE_MISMATCH','Missing release source hash');
  const code=await client.getContractCode(contract);
  // The SDK returns contract source as text. Do not normalize line endings or trim.
  const bytes=new TextEncoder().encode(code);
  const actual=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
  if(actual!==expectedSha256)fail('SOURCE_MISMATCH','Deployed bytes differ from this release');
  return actual;
}
export function argsFor(intent:WriteIntent):(string|number)[]{
  switch(intent.method){
    case 'seal':return [intent.tag,JSON.stringify(intent.specification)];
    case 'approve':return [intent.bookId,intent.revision,intent.allocationHash];
    default:return [intent.bookId,intent.revision];
  }
}
export function receiptStatus(raw:unknown):string{
  const r=obj(raw),named=r.statusName,value=r.status;
  const mapped=transactionsStatusNumberToName[String(value) as keyof typeof transactionsStatusNumberToName];
  if(typeof named==='string'&&mapped&&named!==mapped)fail('UNVERIFIED_RECEIPT','Conflicting receipt statuses');
  return typeof named==='string'?named:mapped??String(value);
}
export function checkFinalReceipt(raw:unknown,hash:TxHash):void{
  const r=obj(raw);
  if(receiptStatus(r)!=='FINALIZED')fail('UNVERIFIED_RECEIPT','Receipt is not FINALIZED',hash);
  if(lower(r.hash??r.txId)!==lower(hash))fail('UNVERIFIED_RECEIPT','Receipt hash differs',hash);
  const receiptList=obj(r.consensus_data).leader_receipt;
  const leaders=Array.isArray(receiptList)?receiptList.map(obj).filter(v=>v.mode==='leader'):[];
  const leader=leaders.at(-1);
  if('txExecutionResultName' in r){
    if(r.txExecutionResultName!=='FINISHED_WITH_RETURN' || (Array.isArray(receiptList) && leader?.execution_result!=='SUCCESS'))fail('TX_FAILED','Execution failed',hash);
    if((r.resultName??r.result_name)!=='MAJORITY_AGREE')fail('CONSENSUS_FAILED','Majority agreement missing',hash);
    const leaderOnly = obj(r.txDataDecoded).leaderOnly ?? r.leader_only;
    if(leaderOnly!==false || (r.execution_mode!==undefined && r.execution_mode!=='NORMAL'))
      fail('UNVERIFIED_RECEIPT','Full consensus missing',hash);
  }else{
    // Stable Studio returns the legacy envelope for RPC readbacks.
    if(!leader || leader.execution_result!=='SUCCESS')fail('TX_FAILED','Leader execution failed or absent',hash);
    if((r.result!==undefined && r.result!==6) || (r.resultName!==undefined && r.resultName!=='MAJORITY_AGREE') || (r.result===undefined && r.resultName===undefined))fail('CONSENSUS_FAILED','Majority agreement missing',hash);
    if(r.leader_only!==false || r.execution_mode!=='NORMAL')fail('UNVERIFIED_RECEIPT','Full consensus missing',hash);
  }
}
export function receiptCall(raw:unknown):Record<string,unknown>{
  const r=obj(raw),decoded=obj(r.txDataDecoded);
  if(decoded.callData)return obj(decoded.callData);
  const encoded=obj(obj(r.data).calldata).base64;
  if(typeof encoded!=='string')return {};
  try{
    const call=obj(abi.calldata.decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))));
    if(typeof call['']==='string' && call.method===undefined)return {...call,method:call['']};
    return call;
  }catch{return {}}
}
export function checkReceipt(raw:unknown,pending:PendingWrite):void{
  checkFinalReceipt(raw,pending.hash);checkIntentBinding(raw,pending);
}
export function checkIntentBinding(raw:unknown,pending:PendingWrite):void{
  const r=obj(raw);
  if(lower(r.hash??r.txId)!==lower(pending.hash))fail('UNVERIFIED_RECEIPT','Receipt hash differs',pending.hash);
  if(lower(r.from_address??r.sender)!==lower(pending.signer)||lower(r.to_address??r.recipient)!==lower(pending.contract))
    fail('UNVERIFIED_RECEIPT','Receipt signer or destination differs',pending.hash);
  const userValue=obj(r.data).user_value??r.value;
  if(userValue!==undefined && String(userValue)!=='0')fail('UNVERIFIED_RECEIPT','Unexpected attached value',pending.hash);
  const call=receiptCall(raw);
  if(call.method!==pending.intent.method || canonical(call.args)!==canonical(argsFor(pending.intent)))
    fail('UNVERIFIED_RECEIPT','Receipt calldata differs from submitted intent',pending.hash);
}
export function checkReadback(book:Book|null,pending:PendingWrite):asserts book is Book{
  if(!book || book.id!==pending.bookId)fail('READBACK_MISMATCH','Book missing after finality',pending.hash);
  const intent=pending.intent;
  if(intent.method==='seal'){
    const expected:Specification=structuredClone(intent.specification);
    expected.members.forEach(m=>m.address=m.address.toLowerCase() as Address);
    if(JSON.stringify(book.input)!==JSON.stringify(expected)){
      // JSON object key order is irrelevant, including nested dictionaries.
      if(canonical(book.input)!==canonical(expected))fail('READBACK_MISMATCH','Sealed input differs',pending.hash);
    }
    if(lower(book.owner)!==lower(pending.signer))fail('READBACK_MISMATCH','Owner differs',pending.hash);
  }else{
    if(book.revision<intent.revision+1)fail('READBACK_MISMATCH','Revision has not advanced',pending.hash);
    if(intent.method==='assess' && (!book.accepted||!book.proof||!book.allocation_hash))fail('READBACK_MISMATCH','Assessment missing',pending.hash);
    if(intent.method==='approve' && (book.allocation_hash!==intent.allocationHash || !book.approvals.some(a=>lower(a)===lower(pending.signer))))
      fail('READBACK_MISMATCH','Signed allocation missing',pending.hash);
    if(intent.method==='cancel' && (book.state!=='CANCELLED'||lower(book.cancelled_by)!==lower(pending.signer)))
      fail('READBACK_MISMATCH','Cancellation missing',pending.hash);
  }
}
function canonical(value:unknown):string{
  if(typeof value==='bigint')return value.toString();
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value!==null&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(obj(value)[k])).join(',')+'}';
  return JSON.stringify(value);
}
export class ShareTallyApi {
  private busy=false;
  constructor(public client:Client,public readonly contract:Address,public readonly sourceSha256:string,public readonly signer:Address){}
  getBook=(id:string)=>readBook(this.client,this.contract,id);
  listBooks=(owner:Address)=>listBooks(this.client,this.contract,owner);
  async submit(intent:WriteIntent,onPhase:(phase:TxPhase)=>void=()=>{}):Promise<PendingWrite>{
    if(this.busy)fail('BUSY','One signing operation at a time');
    this.busy=true;
    const frozen=structuredClone(intent);
    try{
      await verifySource(this.client,this.contract,this.sourceSha256);
      const fees=await studioFees(this.client);
      const accounts=await this.client.getAddresses();
      if(lower(accounts[0])!==lower(this.signer))fail('SIGNER_CHANGED','Reconnect the selected wallet');
      onPhase('AWAITING_SIGNATURE');
      const hash:unknown=await this.client.writeContract({address:this.contract,functionName:frozen.method,args:argsFor(frozen),value:0n,leaderOnly:false,...(fees?{fees}:{})});
      if(typeof hash!=='string'||!/^0x[0-9a-fA-F]{64}$/.test(hash))return fail('BAD_RESPONSE','Missing transaction hash; reconcile wallet before retrying');
      const pending:PendingWrite={hash:hash as TxHash,signer:this.signer,contract:this.contract,bookId:frozen.method==='seal'?this.signer.toLowerCase()+':'+frozen.tag:frozen.bookId,intent:frozen,submittedAt:new Date().toISOString()};
      onPhase('SUBMITTED');return pending;
    }finally{this.busy=false}
  }
  async resume(pending:PendingWrite,onPhase:(phase:TxPhase)=>void=()=>{},timeoutMs=900000,intervalMs=5000):Promise<VerifiedWrite>{
    if(lower(pending.contract)!==lower(this.contract))fail('UNVERIFIED_RECEIPT','Pending operation belongs to another contract',pending.hash);
    await assertNetwork(this.client);
    const started=Date.now();
    while(Date.now()-started<timeoutMs){
      // Transport failures bubble up with pending preserved by the caller. Never resubmit here.
      const receipt=await this.client.getTransaction({hash:pending.hash as import('genlayer-js/types').TransactionHash});
      const status=receiptStatus(receipt);
      if(status==='FINALIZED'){
        checkReceipt(receipt,pending);onPhase('READING_BACK');
        const book=await this.getBook(pending.bookId);checkReadback(book,pending);
        onPhase('VERIFIED');return {pending,receipt,book,verifiedAt:new Date().toISOString(),variant:'latest-final'};
      }
      if(['CANCELED','UNDETERMINED','VALIDATORS_TIMEOUT','LEADER_TIMEOUT'].includes(String(status)))fail('CONSENSUS_FAILED',String(status),pending.hash);
      if(typeof status==='string')onPhase(status as TxPhase);
      await new Promise(resolve=>setTimeout(resolve,intervalMs));
    }
    return fail('WAIT_TIMEOUT','Still unverified; retain this hash and resume polling',pending.hash);
  }
}
