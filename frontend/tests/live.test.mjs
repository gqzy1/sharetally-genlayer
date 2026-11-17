import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../src/domain/liveJournal.ts',import.meta.url),'utf8');
function journal(storage){const exports={};const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(js,{exports,localStorage:storage,JSON});return exports}
const intent={method:'assess',bookId:'owner:quote',revision:0};
test('unknown broadcast and pending operations block duplicate submissions across reloads',()=>{
 const state=new Map();const storage={getItem:k=>state.get(k),setItem:(k,v)=>state.set(k,v)};let j=journal(storage);
 const entry={id:'one',contract:'0xcontract',signer:'owner',intent,phase:'SUBMITTING'};j.saveLiveEntry(entry);
 j=journal(storage);assert.equal(j.outstanding(j.loadLiveEntries(),'owner:quote','0xcontract'),true);
 j.saveLiveEntry({...entry,phase:'UNVERIFIED',pending:{hash:'0xoriginal'}});
 assert.equal(j.loadLiveEntries()[0].pending.hash,'0xoriginal');assert.equal(j.outstanding(j.loadLiveEntries(),'owner:quote','0xother'),false);
 j.saveLiveEntry({...entry,phase:'VERIFIED',verified:{book:{state:'READY'}}});assert.equal(j.outstanding(j.loadLiveEntries(),'owner:quote','0xcontract'),false);
});
test('storage quota failures prevent submission markers from silently disappearing',()=>{
 const j=journal({getItem:()=>null,setItem:()=>{throw Error('quota')}});assert.throws(()=>j.saveLiveEntry({id:'x'}),/quota/);
});
test('real and offline book storage are distinct namespaces',()=>{
 assert.ok(code.includes('sharetally.live.operations.v1'));assert.equal(code.includes('sharetally.offline_books.v1'),false);
});
test('corrupted transaction journals fail closed before a new submission marker',()=>{
 const j=journal({getItem:()=>'{broken',setItem:()=>{throw Error('should not write')}});
 assert.throws(()=>j.loadLiveEntries(true),/Reconcile original hashes/);
 assert.throws(()=>j.saveLiveEntry({id:'new'}),/Reconcile original hashes/);
});
