# Application interface specification

## Page inventory

| Route | Purpose | Required interactions |
| --- | --- | --- |
| `/` | Product introduction and release status | Explain quote → split → all signatures; links to create, inspect and examples; clearly display undeployed state |
| `/books/new` | Prepare a quotation | Title, currency, full quote, optional source locator, 2–4 named wallets and descriptions; roster bit preview; immutable input confirmation; seal |
| `/books` | Organizer catalogue | Read books created by connected or entered owner address; paste an owner-qualified member invitation; empty/error states |
| `/books/:owner/:tag` | Shared book workspace | Latest-final record, immutable quote, assessment action, cost table, share panel, blockers, approvals, cancel and transaction status |
| `/examples` | Offline exploration | Synthetic additive, unknown, coalition-blocked and rounding-blocked examples; permanent offline badge; no signer or transaction |
| `/transactions/:hash` | Recover one local pending operation | Show saved intent, signer, destination, chain, stage and hash; resume the same hash; export receipt and readback |

Paths may use hash routing for static hosting. Resolve book ID as lowercase owner + ':' + exact tag. Direct links and refresh must work. No global contract scan or member inbox is assumed.

## New book

Show character counters and validation before signing. Reject duplicate case-insensitive names, duplicate wallet addresses and absent creator membership. Preserve entered draft on wallet rejection. Present source locator as an unverified declaration. Never fetch arbitrary URLs or interpret a quotation in the frontend. A local preview may show membership masks, not predicted consensus costs. Member order is consequential for minor-unit rounding ties; show this before seal.

After sealing, use the actual owner-qualified ID and load finalized state. Editing creates a new draft/tag; it cannot mutate an existing book. Identical seal retries are contract-idempotent but must not bypass pending-transaction recovery.

## Workspace panels

- Quote: complete sealed text, immutable roster, currency, input hash, owner and revision.
- Coalition costs: one row per nonempty mask with named members, KNOWN/UNKNOWN, total price and accepted excerpt. Empty coalition is protocol zero and not model evidence.
- Split: exact fraction and rounded charge for every member, efficiency sum, tie order and allocation hash. Only calculated proofs have this panel.
- Objections: named coalition, standalone price, sum of assigned costs and exact/rounded excess; distinguish monotonicity decrease from core blocker. Explain that a blocker applies to this split, not all possible allocations.
- Consent: one status per member wallet. Enable approve only for READY, matching named account and absent approval. Show amount, quote and allocation digest before signing. Cancel is available to any member while nonterminal.
- Transaction: current phase, persistent hash, receipt checks and final readback. Wallet signature, network finality and business state are separate concepts.

## Wallet and transaction lifecycle

Use the supplied SDK; do not implement a separate signer or protocol client. Request accounts only after user interaction. Network is Stable Studionet 61999 (`0xf22f`) and RPC is exactly `https://studio.genlayer.com/api`. Handle `accountsChanged`, `chainChanged` and `disconnect`: stop new signing, clear the active session and reconnect. Keep pending records pinned to their original signer, contract, chain and intent. Reading and resuming an already submitted transaction must remain possible without a connected signer.

Read release `deployment.json`. While NOT_DEPLOYED or address is null, disable chain writes and show an honest status. Never substitute a fixture address. A deployed release must pass chain and exact source-byte hash checks before every write.

Before `submit`, save a local SUBMITTING marker, frozen intent and selected account. On returned hash, save PendingWrite immediately and replace the marker. If the browser crashes with only SUBMITTING, show a reconciliation screen and require inspection of wallet history before another transaction. Do not silently retry signing.

Show signing → submitted → network stages → provisional ACCEPTED → FINALIZED execution verification → READING_BACK → VERIFIED. Pending and appeals may take minutes. The supplied adapter checks finalized status, hash, destination, sender, full consensus, successful execution, majority agreement and decoded calldata. It then reads `latest-final` and checks the matching operation's effect. Later concurrent signatures may already be visible; display the latest record rather than demanding an obsolete exact revision.

A timeout means unverified, not failed. Resume the same stored hash. A transport error or readback mismatch retains the hash and exportable intent. A failed finalized execution may leave the book unchanged; refresh it and require a deliberate fresh action. Never auto-assess, auto-approve, auto-cancel or auto-deploy on page load.

## Loading and errors

Loading quote lists, individual books, source verification, wallet prompt, consensus polling and state readback each need distinct text. Disable duplicate action buttons while their operation is unresolved. Preserve displayed finalized data with a visible refresh indicator rather than blanking it during reads. Show not-found separately from RPC failure.

For stale revision, re-read and show changed state without automatic signing. For BLOCKED/REVIEW results use the exact contract states BLOCKED/REVIEW, never a generic green success verdict. On cancellation or commitment, all modifying controls are removed. Display safe plain text; never insert quotation, member names or error strings as HTML. Offline examples and real reads must use separate state stores and unmistakable provenance badges.

## Mock convention

Fixtures use `{provenance:'OFFLINE_AUTHORED', label:string, book:Book}` and never a transaction hash, deployed address, receipt, network-finality claim or fabricated validator transcript. Put fixtures under `frontend/src/fixtures/`. Cover SEALED, REVIEW, nonmonotone BLOCKED, rational blocker, rounding-only blocker, READY with partial approvals, COMMITTED and CANCELLED. Derive example proofs with the canonical offline exporter (`python scripts/export_fixtures.py`), not independent frontend arithmetic. The exporter explicitly uses a scripted host and is never chain evidence.

Use API dependency injection for offline views. No fallback to mock data after a failed live read. Export live results with provenance `FINALIZED_READBACK`, chain, contract, source hash, read variant, book, pending intent and actual receipt if available. A wallet-free read is not transaction execution evidence.

## Suggested layout

```text
frontend/
  src/
    app/                 routing, release config and providers
    pages/               six routes above
    components/          QuotePanel, CoalitionTable, Shares, Blockers, Signatures, TransactionProgress
    hooks/               wallet events, book refresh and pending recovery
    adapters/            imports of ../../.. /sdk public API
    fixtures/            authored offline examples only
    styles/              responsive tokens and accessibility
  tests/                 route, interaction, provenance and recovery tests
```

A static React/TypeScript application is sufficient; no central backend or frontend LLM integration. Use compact tables on desktop and readable cards on narrow screens. Keyboard operation, visible focus, accessible validation and reduced-motion support are required. Large monetary-looking amounts must retain the displayed currency and 2-decimal minor-unit explanation.

## Live release behavior

The application imports the root manifest rather than maintaining a second address. Live catalogue and book routes require a verified source and always read `latest-final`; `?mode=offline` is the explicit example namespace. A live lookup error clears its data and cannot select a fixture.

`WalletProvider` uses `sdk/client.ts` for EIP-1193 network switching, source checks, zero-cost writes and verified readback. A separate ephemeral Studio session signer is available for public test quotations. Session private keys never enter local storage, source, evidence or logs. Member addresses are displayed in full before sealing; each member controls its own signing wallet.

The live operation journal persists a SUBMITTING marker before broadcast, saves returned hashes immediately, and blocks another operation for the same book while an outcome is unresolved. A failed storage write stops signing. An unreadable journal also fails closed before a new write. After a timeout, reload or account change, the transaction page resumes the recorded hash using a read-only client. ACCEPTED remains provisional; VERIFIED requires the SDK's finality, execution, consensus, intent-binding and latest-final readback checks. A surviving unknown-broadcast marker requires wallet-history reconciliation.
