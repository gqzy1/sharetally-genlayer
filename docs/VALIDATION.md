# Validation record

Backend release reviewed on 2026-11-18 (Asia/Shanghai).

| Check | Actual result | Scope |
| --- | --- | --- |
| Contract unit groups | 11 passed | Scripted GenLayer host; permissions, revision/hash binding, terminal states, missing terms, bad outputs, disagreement and injection-shaped evidence |
| Exhaustive arithmetic | 2,187 three-member cost games | All seven nonempty coalition costs in 0–2; monotonicity and supported results checked |
| Four-member arithmetic | 251 cost games | 250 seeded monotone tables plus maximum bounded cost; independent permutation oracle |
| SDK unit groups | 9 passed | Eight base cases plus provider signing guard; receipt/calldata binding, latest-final reads, timeout recovery, wrong network/account |
| TypeScript | passed | SDK, scripts and tests compile against exact genlayer-js 1.1.8 |
| GenVM lint / SDK validation | passed | 7 public methods: 3 views, 4 nonpayable writes; no constructor arguments |
| Stable Studionet read-only schema | passed | Real RPC compilation, exact source digest recorded in `evidence/schema.json` |
| Default deployment/write guards | expected refusal | Running scripts without their explicit environment gates exits before any chain write |
| Deployment / chain lifecycle | not performed | No address, deployment hash or chain execution claim |
| Browser/frontend | not performed | Backend release only |

The 2,187 and 251 arithmetic cases run inside the 11 contract unit groups; they are not additional network tests. SDK tests use authored receipt fixtures whose calldata is encoded with the real SDK. They do not constitute real transaction receipts.

[evidence/contract-tests.txt](../evidence/contract-tests.txt), [evidence/sdk-tests.txt](../evidence/sdk-tests.txt), [evidence/wallet-guard-test.txt](../evidence/wallet-guard-test.txt), [evidence/genvm-check.json](../evidence/genvm-check.json) and [evidence/schema.json](../evidence/schema.json) retain the actual local outputs and read-only compilation response. The linter's I200 advisory says a newer runner exists; the explicitly pinned runner passed the current Stable Studionet compilation. It was not changed to an unverified runner.

## Important limits

Scripted hosts do not test actual model reasoning, validator independence in production, correlated prompt-injection failures, network rotations, appeals, fees or actual wallet-extension behavior. Schema compilation checks source loading and ABI, not an operational multi-party workflow. The full live matrix in `OPERATIONS.md` remains required before advertising a deployed product.

Exact local checks establish integer conservation, the permutation definition of Shapley shares and all coalition inequalities under supplied cost tables. They do not establish that those prices are authentic or that a supplier will honor them. Consensus validates interpretation of declared text, not a supplier identity.
