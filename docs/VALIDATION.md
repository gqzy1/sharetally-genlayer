# Validation and evidence

Only `evidence/receipts/` and recorded live operations constitute network transaction evidence. Authored fixtures and scripted hosts are explicitly offline.

The deployed source matches SHA256 `b5a98d59a3cea8a31829268b264e9bb284138021754e22a8e9bb0a67da16a135`. Deployment transaction `0xf31804d9b6d9a73939b8665beb38e73e237c44de32a463f8472637ce15ab2d75` is FINALIZED, has SUCCESS leader execution and MAJORITY_AGREE with full consensus. Its source was retrieved through SDK 1.1.8 and compared byte-for-byte by SHA256.

Local checks cover exact integer Shapley arithmetic, 2,187 bounded three-member games, 251 four-member cases with an independent permutation oracle, access control, revisions, allocation digest binding, terminal states, malformed model outputs, semantic disagreement, JSON object responses, omitted nullable UNKNOWN fields, and adversarial quotation text. These are deterministic scripted-host tests, not simulated chain evidence.

SDK checks reject provisional ACCEPTED, unsuccessful execution, missing majority, wrong signer/destination/calldata/hash, and wrong wallet network. Timeout recovery polls the same original hash. Frontend checks include all previous routing, fixture, storage and arithmetic tests plus live journal persistence, duplicate suppression and storage failure behavior.

## Evidence interpretation

- FINALIZED establishes finality, not execution success.
- SUCCESS establishes execution, not a READY allocation. A successfully assessed ambiguous quotation may be REVIEW; an unsafe split may be BLOCKED.
- MAJORITY_AGREE and full-consensus mode are checked independently.
- A verified operation also binds actual signer, destination and calldata to its saved intent, and reads actual latest-final state.
- A failed execution is never reported as a successful operation. Negative acceptance must preserve the unchanged book.
- The source pin passes GenVM validation. The linter reports an advisory that a newer runner exists; this release retains the runner that compiled on Stable Studionet.

## Limits

Consensus interprets declared quotation text; supplier identity, price authenticity and fulfillment remain outside the contract. Shared model errors remain possible. Local tests do not establish real validator behavior; network receipts are needed for that. The application does not handle payments or appeals. Wallet-extension prompts depend on the installed wallet; ephemeral session keys are lost on tab reload. The browser operation journal is local history, not an exhaustive global index. Public test quotations contain no private customer information.
