# SpyChain auto-claim relayer

Watches SpyChain for withdrawals and submits the BSC-side claim (`Outbox.executeTransaction`)
automatically, so users never sign a second transaction or need BNB to receive their SPYB.

**Safe by construction:** the claim is permissionless and funds always go to the destination the user
chose when they withdrew. The relayer wallet only ever pays gas — it can't redirect or steal funds.

## Setup

```bash
npm install                      # ethers v5 + @arbitrum/sdk
node gen-wallet.mjs              # -> prints RELAYER_ADDRESS + RELAYER_ENC_KEY, writes .relayer.json
cp relayer.env.example relayer.env
#   set BSC_RPC (a getLogs-capable/keyed provider) and RELAYER_ENC_KEY
```

Fund `RELAYER_ADDRESS` with a little BNB (gas only — ~150k gas per claim).

## Run

```bash
# with Docker (runs next to the node; host network reaches localhost:8449):
docker compose up -d
docker compose logs -f relayer

# or directly:
node relayer.mjs
```

## How it works

1. Scans SpyChain for `ArbSys` `L2ToL1Tx` events from a persisted block cursor (`.state.json`).
2. Tracks each withdrawal; when it reads `CONFIRMED` via `@arbitrum/sdk`, submits the claim.
3. Marks `EXECUTED` messages done — never re-claims (idempotent across restarts).

## Notes

- **`.state.json`** persists the cursor + processed withdrawals — keep it (mounted volume).
- **BSC RPC** needs `eth_getLogs`; the load is light (a few calls per withdrawal). A dedicated key is
  recommended so it doesn't share quota with the node.
- **Monitor the relayer's BNB balance** and top up like any hot wallet.
- Read-only status check for any withdrawal: `node dryrun.mjs <l2txhash>`.
