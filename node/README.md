# Run a SpyChain node

A SpyChain **RPC / full node** syncs the chain's state from BNB Smart Chain and serves the standard
Ethereum JSON-RPC (plus Arbitrum `arb*` methods). It is a non-sequencing node — it needs **no operator
keys**, and forwards user transactions to the public sequencer.

## Requirements

- Docker + Docker Compose
- A **BNB Smart Chain RPC endpoint** that supports `eth_getLogs` over history. A keyed provider
  (e.g. a paid/archive-capable RPC) is strongly recommended — free public BSC RPCs rate-limit or block
  the historical log queries a continuously-syncing node makes.

## Setup

```bash
cp node-config.example.json node-config.json
# edit node-config.json:
#   parent-chain.connection.url  ->  your BNB Smart Chain RPC
docker compose up -d
docker compose logs -f nitro
```

The node serves:
- HTTP JSON-RPC on `:8449`
- WebSocket on `:8548`

Verify it's syncing:

```bash
curl -s http://localhost:8449 \
  -X POST -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Notes

- `node-config.example.json` is configured as an RPC/full node (`sequencer: false`, no batch-poster,
  no validator). Running a sequencer, batch-poster, or validator requires operator keys and is not
  covered here.
- Transactions submitted to this node are forwarded to `https://rpc.spychain.io` (the sequencer).
- Keep `node-config.json` out of version control (it's git-ignored) — a sequencer/validator config
  would contain private keys.
