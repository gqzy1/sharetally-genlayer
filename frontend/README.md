# ShareTally application

A static React/TypeScript workspace for shared quotations, coalition costs, exact Shapley shares and exit objections. It includes persisted local drafts, a catalogue, immutable quote previews, allocation inspection, approval displays and authored transaction-lifecycle examples.

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
| `/books/new` | Prepare and save a local quotation draft |
| `/books` | Offline catalogue and owner-qualified invitations |
| `/books/:owner/:tag` | Quote, costs, allocation, exit inspection and approval status |
| `/examples` | Explicitly authored offline examples |
| `/transactions/:hash` | Saved pending intent or a matching authored lifecycle example |

Unknown transaction hashes do not inherit a demo receipt. Locally saved pending intents remain unverified until actual network checks occur. Authored examples retain an explicit offline badge and are not blockchain evidence.

## Contract interface

The application imports `Book`, member, transaction and state types from the repository's `sdk/types.ts`; fixture data comes from `examples/offline-fixtures.json`. See the root `docs/API.md` and `docs/PROTOCOL.md` for authoritative business semantics.

The checked-in release manifest matches root `deployment.json`: Stable Studionet 61999, SDK 1.1.8, NOT_DEPLOYED and no address. Wallet signing, chain writes, RPC catalogue reads and finality polling are disabled in this release. The source does not implement those live operations merely by changing the deployment flag; deployed operation requires actual SDK integration and network acceptance. No browser-only preview or synthetic receipt is claimed as chain evidence.

## Verification

The frontend suite checks routing, relative import resolution, protocol limits, draft storage, amount precision, fixture invariants, exit inspection and separation of authored transaction scenarios from saved pending records. It does not replace wallet-extension or chain testing.
