# ShareTally

ShareTally turns a shared-service quote for two to four participants into a cost allocation each member can inspect and sign. It is designed for shared print runs, exhibitors and workshop organizers who need to know whether any subgroup would pay less by ordering on its own.

## From quotation to agreement

1. A participating organizer seals the quote and wallet roster. A named member requests assessment.
2. GenLayer's leader and validators independently interpret the standalone price for every nonempty subgroup. Validators compare prices and independently audit source excerpts, subgroup scope and arithmetic.
3. The contract calculates exact Shapley shares and checks the exact and rounded allocations against every subgroup's standalone price. If the benchmark fails, the contract searches for a nonnegative minor-unit split that preserves the total and satisfies every subgroup limit. If none exists the quote is blocked. Incomplete quotes go to review.
4. In READY, each named wallet approves the digest of the same exact split. All signatures are required for COMMITTED. A member can cancel before commitment.

The [ShareTally workspace](https://gqzy1.github.io/sharetally-genlayer/) lets you compare the benchmark to the selected split, inspect an individual subgroup, and open audited examples from Stable Studionet. The example controls work offline. Live books use latest-final state and never substitute offline data.

## Stable Studionet

| Field | Value |
| --- | --- |
| Protocol | sharetally-2 |
| Network | Stable Studionet, chain 61999 |
| RPC | https://studio.genlayer.com/api |
| Contract | [0x03741783AddBfb3710978Fe04E33519989B9Fc13](https://explorer-studio.genlayer.com/address/0x03741783AddBfb3710978Fe04E33519989B9Fc13) |
| Deployment | [0x8cba7f338e0c6de7e6c66ccf13dbeabd7c69e166c49aa9960cd4a9a6cf0db306](https://explorer-studio.genlayer.com/tx/0x8cba7f338e0c6de7e6c66ccf13dbeabd7c69e166c49aa9960cd4a9a6cf0db306) |
| Source SHA-256 | `65a7ed9a835fd611954de9ee39bc2d242a8a9d94fbc08a335b0a7585e91ba80c` |
| Client SDK | `genlayer-js@2.0.0-rc.3` |

See the [milestone and evidence](docs/MILESTONE.md), [protocol](docs/PROTOCOL.md), [contract API](docs/API.md) and [operator guide](docs/OPERATIONS.md). The [v1 address](evidence/deployment-v1.json) and its [historical evidence](docs/VALIDATION.md) remain available.

## Verify

Use Node.js 22+ and Python 3.12+.

```sh
npm ci
npm test
npm run typecheck
npm ci --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
npm run verify:live
```

`npm run verify:live` uses the public RPC to check the deployed source, recorded final receipts and current final book states. It never signs or sends transactions. [Official GenVM lint and validation output](evidence/genvm-lint-v2.json), the [source checksum](evidence/source-v2.sha256) and [RPC schema result](evidence/schema-v2.json) are independently reproducible.

## Scope

Only public quotation data belongs on-chain. Independent extraction and auditing can still share a common interpretation error. The contract supports complete monotone price tables and nonnegative minor-unit charges for up to four members. The fallback picks the first feasible vector in roster order and can be sensitive to that order. Approval records agreement to the allocation. Supplier authenticity, pricing enforceability, procurement and payment are outside the protocol.
