# Network Details

Values to connect a wallet or configure tooling for SpyChain.

| Parameter | Value |
|---|---|
| Network name | SPY Chain |
| Chain ID | **9426** (hex `0x24D2`) |
| Currency symbol | SPYB |
| Currency decimals | 18 |
| RPC URL | `https://rpc.spychain.io` |
| Block explorer | `https://explorer.spychain.io` |
| Settlement layer | BNB Smart Chain (chain 56) |
| Stack | Arbitrum Orbit (Nitro, BoLD) |

## Add SpyChain to a wallet

EIP-3085 `wallet_addEthereumChain` object:

```json
{
  "chainId": "0x24D2",
  "chainName": "SPY Chain",
  "nativeCurrency": { "name": "SPYB", "symbol": "SPYB", "decimals": 18 },
  "rpcUrls": ["https://rpc.spychain.io"],
  "blockExplorerUrls": ["https://explorer.spychain.io"]
}
```

## Contracts

### On BNB Smart Chain (56)

| Contract | Address | Purpose |
|---|---|---|
| SPYB token | `0x7138b48df7D98D7e3cc221BfE7192D0a178182D8` | Native gas asset (bridged into SpyChain) |
| Inbox | `0x27ac1419Cf54D6a83b1C8B094c4fbBD5F83D5cE3` | Deposit entrypoint (SPYB → SpyChain) |
| Outbox | `0x1B00c8efBAD92fF26e4Eeb0c94BE56A4CE18edaF` | Withdrawal claim entrypoint (SpyChain → BSC) |
| Bridge | `0xDCB8b52949E37d459f012EB6D493F61d58e7e0d2` | Custody + message bridge |
| Sequencer Inbox | `0x31215737b9EB1dAA1E474C2F29B9af9459B6E41b` | Batch submission |
| Rollup | `0x29Cfe431C5d431721D38dEB7367B1cad0D14096f` | Rollup / assertion state |

### On SpyChain (9426) — precompiles

Standard Arbitrum precompiles at fixed addresses.

| Precompile | Address | Purpose |
|---|---|---|
| ArbSys | `0x0000000000000000000000000000000000000064` | Initiate withdrawals to BNB Smart Chain |
| NodeInterface | `0x00000000000000000000000000000000000000C8` | Gas estimation / proof construction (RPC-only) |

## Connecting with common libraries

**viem**

```ts
import { defineChain } from 'viem'
export const spyChain = defineChain({
  id: 9426,
  name: 'SPY Chain',
  nativeCurrency: { name: 'SPYB', symbol: 'SPYB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.spychain.io'] } },
  blockExplorers: { default: { name: 'SpyChain Explorer', url: 'https://explorer.spychain.io' } },
})
```

**ethers v6**

```ts
import { JsonRpcProvider } from 'ethers'
const provider = new JsonRpcProvider('https://rpc.spychain.io', 9426)
```
