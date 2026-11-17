# ShareTally

**Share a quote. Inspect the split. Sign the same plan.**

ShareTally helps two to four small exhibitors, print buyers or workshop organizers check a shared-service quote before committing to its cost allocation. A cheaper group total does not guarantee a split that every subgroup will accept. ShareTally exposes both the allocation and the exact subgroup objection.

## Workflow

1. One participating organizer seals the quotation, currency and named wallet roster.
2. Any named member requests assessment. GenLayer's leader and validators independently interpret the complete standalone cost table for every nonempty member combination. Validators compare every decision and independently audit the leader's quotation anchors and arithmetic.
3. Deterministic code computes exact Shapley shares, allocates minor-unit rounding by largest remainder and checks every coalition's incentive to exit. Missing terms produce REVIEW; nonmonotone prices or blocking coalitions produce BLOCKED.
4. READY plans require every named wallet to approve the same allocation digest. The last distinct approval makes the plan COMMITTED. Any member may cancel before commitment.

A quote charging 120 minor units per group plus 30 per participant gives three participants exact shares of 70 each. More complex quotes may produce a blocking coalition even when sharing lowers the grand total. Every computed result remains inspectable.

## Release status

The Intelligent Contract is deployed on Stable Studionet, with exact source-byte verification. The [application](https://gqzy1.github.io/sharetally-genlayer/) connects real wallets and reuses the source-verifying SDK for every write. Offline examples are explicitly separate from live books.

| Release field | Value |
| --- | --- |
| Contract | `0xfE63843CA44aD3089Ba18D4C0298c44431fa4379` |
| Deployment transaction | `0xf31804d9b6d9a73939b8665beb38e73e237c44de32a463f8472637ce15ab2d75` |
| Source SHA256 | `b5a98d59a3cea8a31829268b264e9bb284138021754e22a8e9bb0a67da16a135` |

[Validation and evidence](docs/VALIDATION.md) distinguish network observations, local tests and untested limits. Deployment status does not by itself establish a successful business workflow.

- Network: **Stable Studionet only**, chain **61999**.
- RPC: `https://studio.genlayer.com/api`.
- Exact SDK: `genlayer-js@1.1.8`.
- Python 3.12+ and Node.js 22+.
- No payment, custody, supplier signature, paid external API or central application backend.

## Verify locally

```sh
npm ci
npm test
npm run typecheck
npm ci --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
```

Optional SDK validation: `genvm-lint check contracts/sharetally.py --json` with `genvm-linter==0.11.0`. A newer-runner advisory does not change the source pin. `npm run check:schema` performs only read-only compilation against Stable Studionet.

## Files

| Path | Purpose |
| --- | --- |
| `contracts/sharetally.py` | Complete deployable Intelligent Contract |
| `sdk/types.ts` | Public domain, operation and transaction types |
| `sdk/client.ts` | Wallet, source verification, reads, writes and resumable finality |
| `docs/PRODUCT.md` | Product scope and responsibilities |
| `docs/PROTOCOL.md` | State machine, consensus and arithmetic |
| `docs/API.md` | Contract and application API |
| `docs/INTERFACE.md` | Pages, states and integration requirements |
| `docs/OPERATIONS.md` | Deployment and acceptance procedure |
| `docs/VALIDATION.md` | Actual validation and evidence limits |
| `tests/` | Scripted contract host, independent arithmetic oracle and SDK tests |
| `examples/shared-print.json` | Explicitly synthetic offline input |
| `deployment.json` | Source-verified Stable release configuration |

## Trust boundaries

Consensus interprets a sealed declaration; it does not authenticate the supplier, real-world price or authority of the organizer. Only public quotation metadata belongs on-chain. Quote text may be adversarial. Independent interpretation, schema restrictions and anchor auditing reduce risk but cannot eliminate shared model errors. Shapley allocation is one declared fairness convention. READY means this particular split has no blocking coalition within the complete supplied table; BLOCKED does not prove that no other allocation exists. Participants approve cost instructions, not a payment or enforceable purchase.

Technical background: [GenLayer fit](https://docs.genlayer.com/developers/intelligent-contracts/when-to-use-genlayer), [independent equivalence verification](https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle).
