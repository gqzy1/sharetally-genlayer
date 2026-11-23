# Milestone · recover a signable split

[Compare with the accepted sharetally-1 baseline](https://github.com/gqzy1/sharetally-genlayer/compare/fd98e416c1a9218787f78c7d96a4807ebc72a350...main).

Version one stopped when exact or rounded Shapley shares gave any subgroup a cheaper standalone option. A quote can hit that condition even when there is a budget-balanced integer split that every subgroup can accept. Version two preserves the Shapley benchmark and makes this distinction explicit. A bounded exact solver can recover a signable split. A failed search records `NO_STABLE_INTEGER` for the supported nonnegative model. Approval binds the selected allocation, the original quotation, the accepted coalition table, and the proof to the same digest.

The [protocol](PROTOCOL.md) defines the feasibility constraints and the deterministic tie-break. A separate small-domain brute-force test compares the result against ordered exhaustive search for 1,050 seeded two-, three- and four-member cases. Equal fractional remainders in the benchmark are still resolved in roster order.

## Interactive casebook

The website uses a press-table workspace with interactive paper stacks for the member charges, subgroup-specific quote comparisons and a toggle between the Shapley benchmark and selected allocation. Keyboard-operated member buttons have the same behavior as the visual controls. Reduced-motion preferences disable pointer-driven tilt. The offline examples are labeled, with separate links to verified latest-final books on the same workspace. Case quotations are synthetic demonstration inputs submitted to the real test network.

## Five latest-final books

| Case | State | Meaning |
| --- | --- | --- |
| [Ink and paper](https://gqzy1.github.io/sharetally-genlayer/#/books/0x243df67e916b91ac10989f2d43c575240e6f1b41/stable-rescue?mode=live) | COMMITTED | Shapley rounds to 134/133/133 minor units. The solver recovers 100/100/200, then three separate wallets approve the same digest. |
| [Four printmakers](https://gqzy1.github.io/sharetally-genlayer/#/books/0x9ba058520409c0446197b42144f4cd385e78ec40/shared-setup?mode=live) | READY | All 15 quoted groups assessed. The original Shapley result of 60 each stays selected. |
| [Two presses](https://gqzy1.github.io/sharetally-genlayer/#/books/0x8d10571b74999d4852978bfc31ac7384f568d1be/infeasible-quote?mode=live) | BLOCKED | The standalone caps of 100 each cannot cover a joint price of 300. |
| [Unpriced setup](https://gqzy1.github.io/sharetally-genlayer/#/books/0x5544b40b9807c28e349e8066447dabf589e32322/missing-setup?mode=live) | REVIEW | The fee is unspecified. A prior assessment failed with a model-schema error and left SEALED unchanged. A new assessed transaction reached REVIEW. |
| [Withdrawn workshop](https://gqzy1.github.io/sharetally-genlayer/#/books/0x9ba058520409c0446197b42144f4cd385e78ec40/withdrawn?mode=live) | CANCELLED | A named member cancelled the sealed book. |

The deployment and 13 successful application writes finalized with SUCCESS and majority agreement. The recorded outsider and incorrect allocation digest attempts each finalized with execution ERROR and left the book unchanged. The historical model-schema error is separately recorded as an execution failure with majority disagreement.

## Reproduce the network checks

Run `npm run verify:live` after `npm ci`. The verifier checks the exact checked-out source against the deployed bytes, validates calldata and outcomes for each recorded write and reads back each book through latest-final state. [Deployment manifest](../deployment.json) · [Transaction and state evidence](../evidence/milestone-v2.json) · [Historical v1 manifest](../evidence/deployment-v1.json).

The pinned Python SDK is declared on the first line of [the deployed source](../contracts/sharetally.py). Reproduce the lint and schema artifacts with `genvm-linter==0.11.0`, `genvm-lint check contracts/sharetally.py --json`, `sha256sum -c evidence/source-v2.sha256` and `npm run check:schema`. [Lint result](../evidence/genvm-lint-v2.json) · [Recorded schema](../evidence/schema-v2.json).

The network requires a fee distribution in its transaction envelope. [Earlier gateway rejections](../evidence/milestone-deploy-attempt.json) retain their actual receipts. The v2 client SDK submits the required Stable setup fee with capped test GEN and zero application value. Lint, compilation and receipt verification send no writes.
