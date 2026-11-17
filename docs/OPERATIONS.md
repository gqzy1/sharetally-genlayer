# Operator procedure

This release has not deployed a contract. No script runs a deployment as part of installation, tests, typechecking or schema compilation. No contract address is preselected.

## Before any deployment

1. Run local verification and inspect `docs/VALIDATION.md`.
2. Use only Stable Studionet 61999 and the exact RPC and SDK in the release.
3. Use a dedicated local test signer. Never commit keys, put them into documentation, echo them or reuse a website visitor's wallet as an operator.
4. Run `npm run check:schema` for read-only compilation. This produces `evidence/schema.json` and sends no transaction.

## Deliberate deployment

Set `STUDIO_PRIVATE_KEY` privately in the operator environment and `ENABLE_DEPLOY=STABLE_STUDIONET_61999`, then run `npm run deploy` from the repository root. The constructor takes no arguments. Deployment is full consensus and attaches no application funds. Network funding/availability must be established before sending; zero cash cost is the target, not a promise that network policy never changes.

The script writes a SUBMITTING journal before broadcast. After a hash is returned it stores that hash and source digest. Restart resumes the same pending deployment. A surviving SUBMITTING record means the outcome is unknown: manually reconcile the signer history rather than deleting it and blindly redeploying. A finalized failure is retained for inspection, not silently replaced.

After successful FINALIZED execution and majority agreement, the script reads the new source and compares the exact SHA256. Outputs remain in ignored `artifacts/`. A later release can publish reviewed evidence and replace the undeployed manifest using the actual address. Do not invent an address, mutate a previous project's manifest or label compilation as deployment.

## Lifecycle acceptance

`npm run accept -- intent.json artifacts/unique-operation.json` submits exactly one tagged `WriteIntent`. It requires local `STUDIO_PRIVATE_KEY`, `ENABLE_WRITE=STABLE_STUDIONET_61999` and the verified `artifacts/deployment.json`. Use a unique journal per operation and named member signer. Successful or pending journals are resumed instead of resubmitted. An unknown submitting outcome stops for reconciliation. Scripts require one operator per journal path; do not run concurrent writers over the same file.

Acceptance matrix:

| Scenario | Expected finalized application result |
| --- | --- |
| Complete additive quote; seal, assess, each member approve | READY then COMMITTED, exact conserved charges |
| Missing required fee/scope | REVIEW, no signable split |
| Monotone costs with a subgroup objection | BLOCKED with exact coalition witness |
| Nonmonotone quote | BLOCKED with subset/superset witness |
| Exact core allocation whose minor-unit rounding creates objection | BLOCKED, rounded excess retained |
| Nonmember, stale revision, wrong allocation digest, duplicate approval | Failed execution; unchanged state |
| Member cancellation before last signature | CANCELLED, no later commitment |
| RPC timeout or browser reload | Resume the original hash; no duplicate transaction |

For every submitted operation preserve chain/RPC, input intent, signer, source hash, hash, complete raw receipt and matching latest-final readback. Distinguish business outcomes from execution success. Verify calldata, full consensus, finality, execution and majority agreement. Confirm all actual member signatures for commitment. Retain unsuccessful attempts honestly.

The acceptance script is a one-operation building block, not a claim that this matrix has been run. These scenarios remain **unexecuted on-chain** in this release.
