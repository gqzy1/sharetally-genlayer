# ShareTally application

A React/TypeScript workspace for shared quotations, coalition costs, exact Shapley shares and exit objections. It includes persisted local drafts, a catalogue, immutable quote previews, allocation inspection, approval displays and authored transaction-lifecycle examples.

## Run

From this directory:

```sh
npm ci
npm test
npm run build
npm run dev
```

`npm run build` runs TypeScript checks before producing `dist/`. Vite uses relative asset URLs and a hash router so nested application routes can be refreshed on a static host.

## Routes

| Hash route | Purpose |
| --- | --- |
| `/` | Product overview |
| `/books/new` | Prepare a draft, review immutable terms and seal with a real wallet |
| `/books` | Live latest-final catalogue and owner-qualified invitations; explicit offline mode |
| `/books/:owner/:tag` | Quote, costs, allocation, exit inspection and approval status |
| `/examples` | Explicitly authored offline examples |
| `/transactions/:hash` | Real pending/verified operation with same-hash recovery; separately marked examples |

Unknown transaction hashes do not inherit a demo receipt. Locally saved pending intents remain unverified until actual network checks occur. Authored examples retain an explicit offline badge and are not blockchain evidence.

## Contract interface

The application imports `Book`, member, transaction and state types from the repository's `sdk/types.ts`; fixture data comes from `examples/offline-fixtures.json`. See the root `docs/API.md` and `docs/PROTOCOL.md` for authoritative business semantics.

The application imports root `deployment.json` as its single release manifest. Source verification against chain 61999 gates live reads and writes. `sdk/client.ts` owns provider connection, actual network checks, calldata and signer binding, finality, successful execution, majority agreement and latest-final readback.

Connect an EIP-1193 wallet or create an ephemeral free Studio session wallet. Session keys remain only in tab memory: closing or reloading the tab loses signing access. Keep durable membership in a wallet you control. Every member must sign separately; a connected organizer cannot sign for another member. Transactions attach zero value and stop if the RPC quotes a nonzero gas price.

Live book routes default to live reads; `?mode=offline` explicitly selects offline catalogue/workspace data. Live read failures never fall back to a fixture. Pending transaction hashes and immutable intents are journaled separately from offline drafts. Resume polls the original hash and never calls `writeContract`. Unknown broadcast outcomes lock the book until the signer history is reconciled. Local history is not a global on-chain event index.

## Verification

The frontend suite checks routing, relative import resolution, protocol limits, draft storage, amount precision, fixture invariants, exit inspection and separation of authored transaction scenarios from saved pending records. It does not replace wallet-extension or chain testing.
