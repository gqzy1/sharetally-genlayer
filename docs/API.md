# Public API

The complete TypeScript domain definitions are [sdk/types.ts](../sdk/types.ts). The concrete integration implementation is [sdk/client.ts](../sdk/client.ts). There is no REST server. Every contract view returns a JSON **string**, parsed by the SDK; a missing book returns an empty string, mapped to `null`.

## Contract methods

| Method | Arguments in order | Authorization / precondition | Return / effect |
| --- | --- | --- | --- |
| `protocol` | none | public view | version, limits, chain and interpretation rules |
| `get_book` | `book_id:string` | public view | entire book JSON or empty string |
| `list_books` | `owner:string` | public view | JSON array of created book IDs, maximum 24 |
| `seal` | `tag:string,payload:string` | creator belongs to supplied roster | owner-qualified ID; immutable SEALED book |
| `assess` | `book_id:string,expected_revision:int` | named member; SEALED | full book JSON; REVIEW, BLOCKED or READY |
| `approve` | `book_id:string,expected_revision:int,allocation_hash:string` | named member; READY; not already approved | full JSON; READY or COMMITTED |
| `cancel` | `book_id:string,expected_revision:int` | named member; nonterminal | full JSON; CANCELLED |

## SDK interface

```ts
readClient(): Client
connectWallet(provider): Promise<{client: Client; signer: Address}>
assertNetwork(client): Promise<void>
verifySource(client, contract, sourceSha256): Promise<string> // actual verified digest
assertZeroCost(client): Promise<void>
readBook(client, contract, id): Promise<Book | null>
listBooks(client, contract, owner): Promise<string[]>
new ShareTallyApi(client, contract, sourceSha256, signer)
api.getBook(id): Promise<Book | null>
api.listBooks(owner): Promise<string[]>
api.submit(intent, onPhase?): Promise<PendingWrite>
api.resume(pending, onPhase?, timeoutMs?, intervalMs?): Promise<VerifiedWrite>
```

`WriteIntent` is the tagged union in `sdk/types.ts`. `seal` accepts a `Specification`; the SDK serializes it as a string positional argument. Other methods carry owner-qualified book ID, exact current revision and, for approval, the stored allocation hash. All writes attach zero value and use `leaderOnly:false`. Live configuration must provide a verified deployed address and the release source SHA256; a NOT_DEPLOYED manifest or null address disables writes.

`submit` performs source, network and zero-gas-price checks, then requests the intended write. Persist its returned PendingWrite immediately. `resume` only polls the existing hash and reads state. It never sends another transaction. Timeout or a readback problem retains the pending record. The application must also persist a SUBMITTING marker before calling submit, so a browser crash before receiving a hash requires manual reconciliation instead of blind retry.

## Business data

`Book.input.members[i]` defines bit `1<<i`. `accepted.rows[mask-1]` is the accepted total price for that coalition. `proof.costs[0]` is zero. `proof.numerators[i]/proof.denominator` is the exact share in minor units; `proof.charges[i]` is the actual signed instruction in integer minor units. Divide a charge by 100 only for currency display, never for protocol arithmetic.

`proof` is a discriminated union: REVIEW has unresolved masks; nonmonotone BLOCKED has decreases; calculated READY/BLOCKED has shares and blockers. Do not assume every BLOCKED record contains charges. Pre-assessment and pre-assessment cancellation have no findings or proof. The allocation hash may exist on REVIEW/BLOCKED but cannot be approved.

## Error mapping

| Source | Codes | User action |
| --- | --- | --- |
| Input | TAG, INPUT_SCHEMA, TEXT_BOUND, JSON_BOUND, DUPLICATE_JSON_KEY, CURRENCY, ADDRESS, MEMBER_COUNT, DUPLICATE_NAME, DUPLICATE_WALLET | correct draft before sealing |
| Identity | OWNER_MUST_BE_MEMBER, MEMBER_ONLY | connect the named wallet |
| Conflict | ID_CONFLICT, STALE_REVISION, ALREADY_APPROVED | read fresh state; inspect changes; require deliberate new signature |
| State | NOT_SEALED, NOT_READY, TERMINAL, OWNER_LIMIT | use the current state or create a new corrected book |
| Semantic execution | model/JSON/schema/audit rejection, consensus failure | preserve transaction hash; inspect execution; retry only after reconciling the original attempt |
| SDK | WRONG_NETWORK, SOURCE_MISMATCH, NOT_DEPLOYED, SIGNER_CHANGED | correct wallet/configuration; no signing until resolved |
| SDK | WAIT_TIMEOUT, BAD_RESPONSE, UNVERIFIED_RECEIPT, READBACK_MISMATCH | retain pending intent and hash; resume or inspect; no automatic resubmission |
| Wallet | rejection code 4001 | show cancellation; retain draft; no success toast |

Unknown errors keep their diagnostic message in an expandable technical area. Never infer a successful operation solely from a wallet notification, a returned hash, status ACCEPTED or receipt finality without execution success.
