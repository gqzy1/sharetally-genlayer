# Operator procedure

The active Stable deployment lives in [deployment.json](../deployment.json). Checked-in receipts from older releases are retained separately.

## Verify without signing

Run `npm ci`, `npm test`, `npm run typecheck` and `npm run verify:live`. The live verifier compares the exact local and deployed source, verifies each recorded transaction's destination, signer, calldata and final execution result, then reads back the five books at latest-final. It does not submit any transaction.

Use Python 3.12 and `genvm-linter==0.11.0` to run `genvm-lint check contracts/sharetally.py --json`. The contract declares its pinned Python SDK in its dependency header. `npm run check:schema` independently compiles the release on Stable Studionet (chain 61999) and writes `evidence/schema-v2.json`. These checks are read-only.

## Deploy or write deliberately

Use a dedicated Stable Studionet test signer. Set `STUDIO_PRIVATE_KEY` in the local operator's environment and `ENABLE_DEPLOY=STABLE_STUDIONET_61999`, then run `npm run deploy`. The constructor takes no arguments. The deployment compares the exact contract source after finalized successful execution and writes its manifest to ignored `artifacts/`. Only the verified address and public receipts belong in the repository.

The script journals its intent before signing and preserves the returned transaction hash. If the journal has intent but no hash, manually reconcile the signer history before trying again. If the original hash is present, resume the original operation. Keep finalized failures for inspection.

`npm run accept -- intent.json artifacts/unique-operation.json` submits one tagged `WriteIntent`. It requires a local signer, `ENABLE_WRITE=STABLE_STUDIONET_61999` and `artifacts/deployment.json`. Use a unique journal per operation. The client attaches zero application value and verifies that the Studio fee quote is below its testnet fee cap. A timeout preserves the hash.

The checked-in milestone records a rescue that reaches COMMITTED, a READY Shapley split, BLOCKED, REVIEW and CANCELLED cases, plus authorization and digest rejections. The optional write mode of `verify:milestone` resumes those operations only with their original local signers and journals. For a new independent manual acceptance use the single-operation command. Validate exact source, full consensus, finality, execution outcome and resulting state. The older acceptance scripts and artifacts describe the v1 deployment.

The Pages workflow builds and publishes the single static website. The Checks and browser workflows run without sending chain writes.
