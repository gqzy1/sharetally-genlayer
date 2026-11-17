export type Address = `0x${string}`;
export type TxHash = `0x${string}`;
export type Currency = 'GBP' | 'USD' | 'EUR';
export interface Member { name: string; address: Address; description: string }
export interface Specification { title: string; currency: Currency; quotation: string; source_locator: string; members: Member[] }
export type Finding = {mask: number; status: 'KNOWN'; cost: number; quote: string} | {mask: number; status: 'UNKNOWN'; cost: null; quote: ''};
export interface Blocker {mask: number; standalone_cost: number; share_numerator: number; rounded_charge: number; exact_excess_numerator: number; rounded_excess: number}
export type Proof = {status: 'REVIEW'; unresolved: number[]} | {status: 'BLOCKED'; nonmonotone: {subset: number; superset: number; decrease: number}[]} | {
  status: 'READY' | 'BLOCKED'; costs: number[]; denominator: number; numerators: number[];
  charges: number[]; rounding_order: number[]; blockers: Blocker[];
};
export type BookState = 'SEALED' | 'REVIEW' | 'BLOCKED' | 'READY' | 'COMMITTED' | 'CANCELLED';
export interface Book {
  id: string; owner: Address; input: Specification; input_hash: string; revision: number; state: BookState; approvals: Address[];
  accepted?: {rows: Finding[]}; proof?: Proof; allocation_hash?: string; cancelled_by?: Address;
}
export type WriteIntent = {method: 'seal'; tag: string; specification: Specification} |
  {method: 'assess' | 'cancel'; bookId: string; revision: number} |
  {method: 'approve'; bookId: string; revision: number; allocationHash: string};
export type TxPhase = 'AWAITING_SIGNATURE' | 'SUBMITTED' | 'PENDING' | 'PROPOSING' | 'COMMITTING' | 'REVEALING' |
  'ACCEPTED' | 'READY_TO_FINALIZE' | 'APPEAL_COMMITTING' | 'APPEAL_REVEALING' | 'FINALIZED' | 'READING_BACK' | 'VERIFIED';
export interface PendingWrite {hash: TxHash; signer: Address; contract: Address; bookId: string; intent: WriteIntent; submittedAt: string}
export interface VerifiedWrite {pending: PendingWrite; receipt: unknown; book: Book; verifiedAt: string; variant: 'latest-final'}
export type ErrorCode = 'WRONG_NETWORK' | 'NOT_DEPLOYED' | 'SOURCE_MISMATCH' | 'BAD_RESPONSE' | 'BUSY' | 'SIGNER_CHANGED' |
  'REJECTED' | 'TX_FAILED' | 'CONSENSUS_FAILED' | 'WAIT_TIMEOUT' | 'READBACK_MISMATCH' | 'UNVERIFIED_RECEIPT';
export class ShareTallyError extends Error {
  constructor(public code: ErrorCode, message: string, public hash?: TxHash) { super(message); this.name='ShareTallyError'; }
}
