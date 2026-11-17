/** Real browser acceptance. Writes are opt-in and skipped after published successful evidence. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
const manifest=JSON.parse(await fs.readFile('deployment.json','utf8'));
let saved=null;try{saved=JSON.parse(await fs.readFile('evidence/browser-live.json','utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const canWrite=process.env.ENABLE_BROWSER_WRITE==='STABLE_STUDIONET_61999'&&!saved;
if(!saved&&!canWrite){const live=JSON.parse(await fs.readFile('evidence/live.json','utf8'));if(live.finalBook?.state!=='COMMITTED')throw Error('Real COMMITTED evidence required for read-only browser checks');saved={owner:live.finalBook.owner,bookId:live.finalBook.id}}
await fs.mkdir('artifacts',{recursive:true});
const server=spawn('npm',['run','preview','--prefix','frontend','--','--host','127.0.0.1','--port','5175'],{stdio:'ignore'});
let browser;const errors=[],pages=[];
const snapshot=async()=>{const operations=[];for(const p of pages){try{operations.push(...await p.evaluate(()=>JSON.parse(localStorage.getItem('sharetally.live.operations.v1')??'[]')))}catch{}}return operations};
function sanitize(r){const result=Object.fromEntries(['hash','from_address','to_address','status','statusName','result','resultName','leader_only','execution_mode','value','txExecutionResultName','txDataDecoded','data'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));delete result.data?.contract_code;if(r.consensus_data)result.consensus_data={votes:r.consensus_data.votes,leader_receipt:r.consensus_data.leader_receipt.map(x=>Object.fromEntries(['mode','vote','execution_result','genvm_result','result','eq_outputs'].filter(k=>x[k]!==undefined).map(k=>[k,x[k]])))};return JSON.parse(JSON.stringify(result,(_key,value)=>{if(value&&typeof value==='object'&&typeof value.base64==='string'){const {raw,...encoded}=value;return encoded}return value}))}
try{
 for(let i=0;i<30;i++){try{const r=await fetch('http://127.0.0.1:5175');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,500))}
 browser=await chromium.launch({headless:true,...process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{},args:['--no-sandbox']});
 if(!canWrite){
  const p=await browser.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));
  const bookId=saved.bookId??`${saved.owner.toLowerCase()}:browser-print`;
  await p.goto(`http://127.0.0.1:5175/#/books/${bookId.replace(':','/')}?mode=live`);
  await p.getByLabel('Book state: COMMITTED').waitFor({timeout:90000});
  await p.getByRole('button',{name:'Create Free Studio Session',exact:true}).click();await p.getByTestId('wallet-address').waitFor({timeout:90000});
  if(errors.length)throw Error(errors.join('\n'));
  await fs.writeFile('artifacts/browser-smoke.json',JSON.stringify({kind:'read-only-browser-smoke',sourceSha256:manifest.sourceSha256,bookId,state:'COMMITTED',observedAt:new Date().toISOString(),transactionsSent:0,errors},null,2));console.log('Read-only browser latest-final COMMITTED confirmed; zero transactions sent.');
 }else{
  const a=await browser.newPage(),b=await browser.newPage();pages.push(a,b);
  for(const p of pages){p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:5175/#/books/new');await p.getByRole('button',{name:'Create Free Studio Session',exact:true}).click();await p.getByTestId('wallet-address').waitFor({timeout:90000})}
  const owner=await a.getByTestId('wallet-address').textContent(),member=await b.getByTestId('wallet-address').textContent();
  console.log('Two distinct real Studio signers',owner,member);if(owner===member)throw Error('Wallets must differ');
  await a.locator('#book-tag').fill('browser-print');await a.locator('#book-title').fill('Browser shared print setup');await a.locator('#book-organizer').fill(owner);await a.locator('#m-addr-0').fill(owner);await a.locator('#m-addr-1').fill(member);
  await a.locator('#book-quotation').fill('The total price is 120 minor units per nonempty group, plus 30 minor units per member. No other fees apply.');
  await a.getByRole('button',{name:'Seal On-Chain',exact:true}).click();await a.getByRole('button',{name:'Confirm Live Seal',exact:true}).click();
  await a.waitForURL('**/books/'+owner.toLowerCase()+'/browser-print?mode=live',{timeout:180000});console.log('Browser seal finalized');
  await a.getByRole('button',{name:'Assess with Consensus',exact:true}).click();await a.getByRole('button',{name:'Approve Exact Allocation',exact:true}).waitFor({timeout:300000});console.log('Browser consensus READY');
  await a.getByRole('button',{name:'Approve Exact Allocation',exact:true}).click();await a.waitForFunction(()=>document.body.innerText.includes('1/2 approvals'),null,{timeout:180000});console.log('Owner independently approved');
  await b.evaluate(url=>{location.hash=url},`/books/${owner.toLowerCase()}/browser-print?mode=live`);await b.getByRole('button',{name:'Approve Exact Allocation',exact:true}).waitFor({timeout:90000});await b.getByRole('button',{name:'Approve Exact Allocation',exact:true}).click();
  await b.waitForFunction(()=>document.body.innerText.includes('2/2 approvals'),null,{timeout:180000});console.log('Browser COMMITTED');
  await a.getByRole('button',{name:'Refresh Final State',exact:true}).click();await a.getByLabel('Book state: COMMITTED').waitFor({timeout:90000});
  const operations=await snapshot();for(const op of operations){if(!op.verified)throw Error('Unverified browser operation');op.verified.receipt=sanitize(op.verified.receipt)}
  if(operations.length!==4||errors.length)throw Error('Expected four verified writes and no browser errors');
  const evidence={kind:'real-browser-live-acceptance',chainId:61999,rpc:manifest.rpc,contract:manifest.address,sourceSha256:manifest.sourceSha256,owner,member,completedAt:new Date().toISOString(),errors,operations};
  await fs.writeFile('artifacts/browser-live.json',JSON.stringify(evidence,null,2)+'\n');await a.screenshot({path:'artifacts/browser-committed.png',fullPage:true});console.log('Real browser seal, assessment and two distinct approvals verified.');
 }
}catch(e){
 await fs.writeFile('artifacts/browser-attempt.json',JSON.stringify({error:String(e),operations:await snapshot(),observedAt:new Date().toISOString()},null,2));
 for(const p of pages)console.error((await p.locator('body').innerText()).slice(0,2200));throw e;
}finally{await browser?.close();server.kill()}
