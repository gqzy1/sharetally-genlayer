import assert from 'node:assert/strict';
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createAccount, createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {type TransactionHash} from 'genlayer-js/types';
import {ShareTallyApi, checkFinalReceipt, checkIntentBinding, checkReceipt, readBook, readClient, receiptStatus, verifySource} from '../sdk/client.js';
import type {Address, Book, PendingWrite, Specification, WriteIntent} from '../sdk/types.js';
import {publicReceipt} from './receipts.js';

const writing = process.argv.includes('--write');
if (writing && process.env.ENABLE_WRITE !== 'STABLE_STUDIONET_61999') throw Error('Explicit Stable opt-in required');
const file = 'evidence/milestone-v2.json';
const parse = async (path: string) => JSON.parse(await readFile(path,'utf8'));
const manifest = await parse(writing ? 'artifacts/deployment.json' : 'deployment.json');
const reader = readClient();
assert.equal(manifest.protocol, 'sharetally-2');
assert.equal(manifest.chainId, 61999);
assert.equal(manifest.rpc, 'https://studio.genlayer.com/api');
assert.equal(createHash('sha256').update(await readFile('contracts/sharetally.py')).digest('hex'),manifest.sourceSha256);
assert.equal(await verifySource(reader, manifest.address, manifest.sourceSha256), manifest.sourceSha256);
const deploy = await reader.getTransaction({hash:manifest.deployTransaction});
checkFinalReceipt(deploy, manifest.deployTransaction);
const data = await parse(file).catch((e: NodeJS.ErrnoException) => {
  if (!writing || e.code !== 'ENOENT') throw e;
  return {deployment:manifest, deploymentReceipt:publicReceipt(deploy), actors:[], operations:{} as Record<string, any>, cases:{} as Record<string, Book>};
});
assert.equal(data.deployment.address,manifest.address);
async function save() {
  // Serialise immutable snapshots to avoid interleaved writes by independent cases.
  const json = JSON.stringify(data, null, 2)+'\n';
  const previous = saved;
  saved = previous.then(async () => { await writeFile(file+'.tmp',json); await rename(file+'.tmp',file); });
  await saved;
}
let saved = Promise.resolve();
const clients: ShareTallyApi[] = [];
const actorBroadcasts = Array.from({length:4}, () => Promise.resolve());
if (writing) {
  const keys: string[] = await parse('.local/milestone-actors.json');
  for (const key of keys) {
    const account = createAccount(key as Address);
    clients.push(new ShareTallyApi(createClient({chain:studionet,endpoint:manifest.rpc,account}),manifest.address,manifest.sourceSha256,account.address));
  }
  const actors = clients.map(c => c.signer.toLowerCase());
  assert.equal(new Set(actors).size,4);
  assert.deepEqual(data.actors.length ? data.actors : actors, actors);
  data.actors = actors;
  const dep = deploy as unknown as { from_address?:string; sender?:string };
  assert.equal((dep.from_address ?? dep.sender)?.toLowerCase(), actors[0]);
}
const quote = (prices: Array<[string,number]>) =>
  'The complete prices below are in minor GBP units for exactly the named subset. No other fees apply.\n' +
  prices.map(([name,cost]) => name + ': ' + cost + ' minor GBP units.').join('\n');
const names = ['Ada','Bo','Cy','Dee'];
function specification(title:string, seats:number[], quotation:string): Specification {
  return {title,currency:'GBP',quotation,source_locator:'Synthetic Studionet demonstration quotation',members:seats.map((i,j) => ({name:names[j],address:data.actors[i],description:'One exhibition print order'}))};
}
const fallback = quote([['Ada',100],['Bo',100],['Ada + Bo',400],['Cy',200],['Ada + Cy',300],['Bo + Cy',300],['Ada + Bo + Cy',400]]);
const noSplit = quote([['Ada',100],['Bo',100],['Ada + Bo',300]]);
const standard = 'Every nonempty subset pays exactly 120 minor GBP units as setup, plus 30 minor GBP units per member. No other fees apply.';
const review = 'Every nonempty subset pays 30 minor GBP units per member plus a mandatory setup fee. The amount of the setup fee is unspecified for every subset.';

async function checkedReceipt(p: PendingWrite, error?:string, expectedConsensus='MAJORITY_AGREE') {
  if (writing) await reader.waitForTransactionReceipt({hash:p.hash as TransactionHash,waitUntil:'finalized',interval:5000,retries:150});
  const tx = await reader.getTransaction({hash:p.hash as TransactionHash});
  if (!error) checkReceipt(tx,p);
  else {
    checkIntentBinding(tx,p);
    const r = tx as unknown as { result_name?:string; resultName?:string; leader_only:boolean; execution_mode:string; consensus_data?:{leader_receipt:{mode:string;execution_result:string}[]} };
    assert.equal(receiptStatus(tx),'FINALIZED');
    assert.equal(r.resultName??r.result_name,expectedConsensus);
    assert.equal(r.leader_only,false);
    assert.equal(r.execution_mode,'NORMAL');
    assert.equal(r.consensus_data?.leader_receipt?.filter(x=>x.mode==='leader').at(-1)?.execution_result,'ERROR');
    assert.ok(JSON.stringify(tx).includes(error));
  }
  return publicReceipt(tx);
}
async function operation(name:string, actor:number, intent:WriteIntent, error?:string):Promise<Book> {
  const api = clients[actor];
  let entry = data.operations[name];
  if (entry?.book) return entry.book;
  if (!entry) {
    const before = intent.method === 'seal' ? null : await api.getBook(intent.bookId);
    entry = data.operations[name] = {intent, error, before};
    await save();
    const submission = actorBroadcasts[actor].then(() => api.submit(intent));
    actorBroadcasts[actor] = submission.then(() => {}, () => {});
    entry.pending = await submission;
    await save();
    console.log(name,entry.pending.hash);
  }
  assert.ok(entry.pending,'Broadcast status unknown. Reconcile the signer and book before retrying.');
  entry.receipt = await checkedReceipt(entry.pending,error);
  const book = await api.getBook(entry.pending.bookId);
  assert.ok(book);
  if (error) assert.deepEqual(book,entry.before);
  else if (intent.method==='seal') assert.deepEqual(book.input,intent.specification);
  else {
    assert.equal(book.revision,intent.revision+1);
    if (intent.method==='approve') {
      assert.equal(book.allocation_hash,intent.allocationHash);
      assert.ok(book.approvals.includes(data.actors[actor]));
    }
    if (intent.method==='cancel') assert.equal(book.state,'CANCELLED');
  }
  entry.book = book;
  await save();
  console.log(name,error ?? book.state);
  return book;
}
async function assess(tag:string, actor:number, spec:Specification) {
  const book = await operation(tag+'-seal',actor,{method:'seal',tag,specification:spec});
  return operation(tag+'-assess',actor,{method:'assess',bookId:book.id,revision:0});
}
function method(book:Book) { return book.proof && 'charges' in book.proof ? book.proof.method : undefined; }
function verifyScenarios(cases: Record<string,Book>) {
  assert.equal(cases.recovered.state,'COMMITTED');
  assert.equal(method(cases.recovered),'STABLE_INTEGER');
  assert.deepEqual(cases.recovered.approvals,cases.recovered.input.members.map(m=>m.address));
  assert.equal(cases.infeasible.state,'BLOCKED');
  assert.equal(method(cases.infeasible),'NO_STABLE_INTEGER');
  assert.equal(cases.standard.state,'READY');
  assert.equal(method(cases.standard),'SHAPLEY');
  assert.equal(cases.incomplete.state,'REVIEW');
  assert.equal(cases.cancelled.state,'CANCELLED');
  const p = cases.recovered.proof;
  assert.ok(p && 'charges' in p && p.blockers.length>0);
  assert.deepEqual(p.selected_charges,[100,100,200]);
}
if (writing) {
  await mkdir('evidence',{recursive:true});
  await save();
  const results = await Promise.allSettled([
    async () => {
      let book = await assess('stable-rescue',0,specification('Ink and paper · recovered split',[0,1,2],fallback));
      assert.equal(method(book),'STABLE_INTEGER');
      const approval = (hash: string):WriteIntent => ({method:'approve', bookId:book.id,revision:book.revision,allocationHash:hash});
      await operation('reject-outsider',3,approval(book.allocation_hash!),'MEMBER_ONLY');
      await operation('reject-digest',0,approval('0'.repeat(64)),'ALLOCATION_MISMATCH');
      for (let i=0;i<3;i++) book = await operation('approve-'+i,i,approval(book.allocation_hash!));
      data.cases.recovered = book;
      await save();
    },
    async () => { data.cases.infeasible = await assess('infeasible-quote',1,specification('Two presses · no stable split',[1,0],noSplit)); await save(); },
    async () => { data.cases.standard = await assess('shared-setup',2,specification('Four printmakers · shared setup',[2,0,1,3],standard)); await save(); },
    async () => {
      data.cases.incomplete = await assess('missing-setup',3,specification('Unpriced setup · review needed',[3,0],review));
      await save();
    },
    async () => {
      const cancelled = await operation('withdrawn-seal',2,{method:'seal',tag:'withdrawn',specification:specification('Withdrawn workshop quote',[2,0],standard)});
      data.cases.cancelled = await operation('withdrawn-cancel',2,{method:'cancel',bookId:cancelled.id,revision:0});
      await save();
    },
  ].map(run=>run()));
  for (const result of results) if (result.status==='rejected') console.error(result.reason);
  assert.ok(results.every(r=>r.status==='fulfilled'),'Case failed; inspect preserved hashes.');
  verifyScenarios(data.cases);
  await save();
} else {
  verifyScenarios(data.cases);
  const entries = Object.values(data.operations) as {pending:PendingWrite;error?:string;consensus?:string;receipt:unknown;before?:Book;book:Book}[];
  assert.equal(entries.filter(entry=>entry.error).length,3);
  assert.equal(entries.filter(entry=>!entry.error).length,13);
  assert.equal(new Set(entries.map(entry=>entry.pending.hash)).size,entries.length);
  assert.deepEqual(publicReceipt(deploy),data.deploymentReceipt);
  await Promise.all(Object.entries(data.cases as Record<string,Book>).map(async ([name,book]) => {
    assert.deepEqual(await readBook(reader,manifest.address,book.id),book,name);
  }));
  for (let offset=0; offset<entries.length; offset+=4) {
    await Promise.all(entries.slice(offset,offset+4).map(async entry => {
      assert.deepEqual(await checkedReceipt(entry.pending,entry.error,entry.consensus),entry.receipt,entry.pending.hash);
      if (entry.error) assert.deepEqual(entry.book,entry.before);
    }));
  }
}
console.log('Verified five latest-final cases for',manifest.address);
