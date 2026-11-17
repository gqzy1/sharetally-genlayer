import type { PendingWrite, VerifiedWrite, WriteIntent } from '../../../sdk/types';
export type LiveEntry = {
    id: string;
    contract: string;
    intent: WriteIntent;
    signer: string;
    phase: string;
    pending?: PendingWrite;
    verified?: VerifiedWrite;
    error?: string;
};
export const LIVE_KEY = 'sharetally.live.operations.v1';
export function loadLiveEntries(strict = false): LiveEntry[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(LIVE_KEY) ?? '[]');
        if (!Array.isArray(parsed))
            throw Error('Invalid journal');
        return parsed;
    }
    catch (e) {
        if (strict)
            throw Error('Transaction journal is unreadable. Reconcile original hashes before signing again.');
        return [];
    }
}
export function saveLiveEntry(entry: LiveEntry) {
    const entries = loadLiveEntries(true);
    const at = entries.findIndex(e => e.id === entry.id);
    if (at < 0)
        entries.push(entry);
    else
        entries[at] = entry;
    // A storage error must stop submission: hashes must survive navigation/reload.
    localStorage.setItem(LIVE_KEY, JSON.stringify(entries, (_, v) => typeof v === 'bigint' ? v.toString() : v));
}
export function intentBook(intent: WriteIntent, signer: string) { return intent.method === 'seal' ? `${signer.toLowerCase()}:${intent.tag}` : intent.bookId; }
export function outstanding(entries: LiveEntry[], bookId: string, contract: string) {
    return entries.some(e => e.contract.toLowerCase() === contract.toLowerCase() && intentBook(e.intent, e.signer) === bookId && !e.verified && !['REJECTED', 'FAILED'].includes(e.phase));
}
