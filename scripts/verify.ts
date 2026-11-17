/** Read-only replay of public evidence against the exact source and current finalized chain. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readClient, verifySource, checkReceipt, checkFinalReceipt, checkIntentBinding, readBook, receiptStatus } from '../sdk/client.js';
import type { Address, PendingWrite } from '../sdk/types.js';
import type { TransactionHash } from 'genlayer-js/types';
const manifest = JSON.parse(await readFile('deployment.json', 'utf8'));
if (manifest.status !== 'DEPLOYED' || manifest.chainId !== 61999 || manifest.rpc !== 'https://studio.genlayer.com/api' || manifest.sdk !== 'genlayer-js@1.1.8')
    throw Error('Incorrect release');
const sha = createHash('sha256').update(await readFile('contracts/sharetally.py')).digest('hex');
if (sha !== manifest.sourceSha256)
    throw Error('Local source digest mismatch');
const client = readClient();
const onchainSha256 = await verifySource(client, manifest.address as Address, sha);
const receipt = await client.getTransaction({ hash: manifest.deployTransaction as TransactionHash });
checkFinalReceipt(receipt, manifest.deployTransaction);
const live = JSON.parse(await readFile('evidence/live.json', 'utf8'));
if (live.deployment.address !== manifest.address)
    throw Error('Evidence address mismatch');
const operations = [];
for (const op of live.operations) {
    const p = op.pending as PendingWrite;
    const r = await client.getTransaction({ hash: p.hash as TransactionHash });
    if (op.expectedError) {
        checkIntentBinding(r, p);
        if (receiptStatus(r) !== 'FINALIZED' || (r as any).result !== 6 || (r as any).leader_only !== false || (r as any).execution_mode !== 'NORMAL')
            throw Error('Negative finality/consensus missing');
        let code = '';
        try {
            checkReceipt(r, p);
        }
        catch (e) {
            code = (e as {
                code: string;
            }).code;
        }
        if (code !== 'TX_FAILED' || !JSON.stringify(r).includes(op.expectedError))
            throw Error('Missing expected execution failure');
    }
    else
        checkReceipt(r, p);
    if (!op.verified)
        throw Error('Incomplete evidence operation');
    operations.push({ name: op.name, hash: p.hash, status: 'FINALIZED', expectedError: op.expectedError ?? null, verified: true });
}
const finalBook = await readBook(client, manifest.address, live.finalBook.id);
if (finalBook?.state !== 'COMMITTED' || finalBook.approvals.length !== finalBook.input.members.length || new Set(finalBook.approvals).size !== finalBook.approvals.length)
    throw Error('Missing final independent approvals');
const result = { kind: 'read-only-live-evidence-reverification', chainId: 61999, sourceSha256: sha, onchainSha256, sourceMatch: sha === onchainSha256, observedAt: new Date().toISOString(), deployment: manifest.deployTransaction, operations, finalBook, variant: 'latest-final' };
await writeFile('evidence/source-verification.json', JSON.stringify(result, null, 2) + '\n');
console.log('Verified source, deployment, all recorded operations, and latest-final COMMITTED state. No transactions sent.');
