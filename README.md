# SpyChain

**SpyChain** is an [Arbitrum Orbit](https://arbitrum.io/orbit) L2 settled on **BNB Smart Chain**, built
for onchain stock markets, using **SPYB** as its native gas asset.

This repository contains the developer tooling, documentation, and node setup for building on and
running SpyChain.

| | |
|---|---|
| Chain ID | **9426** (`0x24D2`) |
| Settlement layer | BNB Smart Chain (56) |
| Native gas token | SPYB (18 decimals) |
| RPC | `https://rpc.spychain.io` |
| Explorer | `https://explorer.spychain.io` |
| Stack | Arbitrum Orbit (Nitro, BoLD) |

## What's here

- **[docs/](docs/)** — integration guides:
  - [network.md](docs/network.md) — chain parameters, contract addresses, endpoints, add-to-wallet.
  - [bridge-integration.md](docs/bridge-integration.md) — deposit & withdraw SPYB between BNB Smart
    Chain and SpyChain.
  - [claiming-withdrawals.md](docs/claiming-withdrawals.md) — completing withdrawals (manual claim or
    the auto-claim relayer).
- **[relayer/](relayer/)** — the auto-claim relayer: watches for confirmed withdrawals and submits the
  BSC-side claim automatically, so users get gasless one-step withdrawals.
- **[node/](node/)** — run your own SpyChain RPC / full node.

## Quick start

Talk to the network:

```bash
curl -s https://rpc.spychain.io \
  -X POST -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# -> {"jsonrpc":"2.0","id":1,"result":"0x24d2"}   (0x24d2 = 9426)
```

Add the network with the values in [docs/network.md](docs/network.md), then bridge SPYB in following
[docs/bridge-integration.md](docs/bridge-integration.md).

## License

MIT — see [LICENSE](LICENSE).
