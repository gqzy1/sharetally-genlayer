import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assertNetwork,readClient} from '../sdk/client.js';
const client=readClient();await assertNetwork(client);
const source=await readFile(new URL('../contracts/sharetally.py',import.meta.url));
const schema=await client.getContractSchemaForCode(source);
await mkdir('evidence',{recursive:true});
await writeFile('evidence/schema-v2.json',JSON.stringify({kind:'read-only-rpc-schema-compilation',chainId:61999,rpc:'https://studio.genlayer.com/api',
 sourceSha256:createHash('sha256').update(source).digest('hex'),observedAt:new Date().toISOString(),schema},null,2)+'\n');
console.log('Schema compiled without deployment or transaction.');
