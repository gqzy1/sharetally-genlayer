# Product and architecture

## User and problem

Small exhibitors often buy a joint print run or shared setup service. A vendor's written quote may combine a group fee, per-member pricing and named-member discounts. Equal division can overcharge one subgroup compared with buying separately. A private spreadsheet also lets one organizer silently change the quote or allocation after others agree.

ShareTally fixes one quote and roster, independently validates its complete coalition cost interpretation and requires signatures on one immutable allocation. Initial scope is 2–4 named wallets and GBP/USD/EUR amounts in integer hundredths. Roster order is fixed and determines deterministic tie-breaking. There is no exchange conversion.

## Responsibilities

| Layer | Responsibility |
| --- | --- |
| Intelligent Contract | Immutable input, independent semantic consensus, exact Shapley calculation, rounding, coalition checks, permission checks, approvals and terminal state |
| SDK | Stable network restriction, deployed source hash, signing, transaction intent binding, finalized execution verification, finalized state readback |
| Application | Input assistance, exact quote preview, combination explorer, share display, signature status, recovery of pending operations and exports |
| Members | Decide whether the declared quote is authentic and acceptable; sign only a plan they inspected |

No server, database, indexer, private frontend model key, token economics or external data feed is required. The on-chain catalog lists only books an address created. Member invitations are shareable owner-qualified book IDs rather than an indexed inbox.

## Closed user journey

Create a quote → seal → assess → inspect the entire table → resolve missing terms in a new book if necessary → review exact and rounded shares → each member approves → view and export the committed record. Any member may cancel before commitment. Editing, roster replacement and reassessment of completed findings are deliberately absent; a corrected quote creates a new book.

The current release is deployed on Stable Studionet (chain ID 61999). The published application reads the release manifest and verifies the deployed contract's exact source bytes before enabling writes. Live books and explicitly labelled offline examples remain separate. Deployment and browser acceptance records are retained under `evidence/`; schema compilation alone is not evidence of deployment or acceptance.

## Acceptance scope

A complete application must make the combination costs, unknown entries, monotonicity counterexamples, exact fractions, rounded amounts and blocking witnesses visible. It must support book links and direct refresh, independent member wallets, rejection and cancellation, source verification and pending transaction recovery. A successful assessment transaction can legitimately produce BLOCKED or REVIEW. Never label those transactions as failed executions.
