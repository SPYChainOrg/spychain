# Bridge Integration

Everything needed to move **SPYB** between BNB Smart Chain and SpyChain programmatically — for building a
bridge UI or backend. All addresses are verified against the live deployment.

> **Scope:** only the native gas token **SPYB** is bridgeable today (both directions). A general ERC-20
> token bridge is not yet deployed — do not build arbitrary-token flows against it.

## Networks

| | BNB Smart Chain (L1) | SpyChain (L2) |
|---|---|---|
| Chain ID | 56 (`0x38`) | 9426 (`0x24D2`) |
| RPC | any BSC RPC | `https://rpc.spychain.io` |
| Explorer | `https://bscscan.com` | `https://explorer.spychain.io` |
| Native currency | BNB (18) | SPYB (18) |

## Key contracts

| Contract | Chain | Address |
|---|---|---|
| SPYB token | BSC | `0x7138b48df7D98D7e3cc221BfE7192D0a178182D8` |
| Inbox (ERC20Inbox) | BSC | `0x27ac1419Cf54D6a83b1C8B094c4fbBD5F83D5cE3` |
| Outbox | BSC | `0x1B00c8efBAD92fF26e4Eeb0c94BE56A4CE18edaF` |
| Bridge | BSC | `0xDCB8b52949E37d459f012EB6D493F61d58e7e0d2` |
| Sequencer Inbox | BSC | `0x31215737b9EB1dAA1E474C2F29B9af9459B6E41b` |
| Rollup | BSC | `0x29Cfe431C5d431721D38dEB7367B1cad0D14096f` |
| ArbSys | SpyChain | `0x0000000000000000000000000000000000000064` |

## Deposit — BSC → SpyChain

Two on-chain steps on BNB Smart Chain. Credits the **same address** on SpyChain, 1:1 (18↔18 decimals).

```ts
import { parseUnits } from 'viem'
const INBOX = '0x27ac1419Cf54D6a83b1C8B094c4fbBD5F83D5cE3'
const SPYB  = '0x7138b48df7D98D7e3cc221BfE7192D0a178182D8'
const amount = parseUnits('10', 18) // 10 SPYB

// 1) approve SPYB to the Inbox
await wallet.writeContract({ address: SPYB, abi: erc20Abi, functionName: 'approve', args: [INBOX, amount] })

// 2) deposit  (ERC20Inbox.depositERC20, selector 0xb79092fd)
await wallet.writeContract({
  address: INBOX,
  abi: [{ type:'function', name:'depositERC20', stateMutability:'nonpayable',
          inputs:[{name:'amount',type:'uint256'}], outputs:[{type:'uint256'}] }],
  functionName: 'depositERC20', args: [amount],
})
```

The sequencer credits the SpyChain balance within seconds. Deposits credit `msg.sender`; crediting a
different L2 address requires the retryable-ticket path.

## Withdraw — SpyChain → BSC

**Phase A — initiate on SpyChain** (`value` = amount, `destination` = BSC recipient):

```ts
const ARBSYS = '0x0000000000000000000000000000000000000064'
await l2Wallet.writeContract({
  address: ARBSYS,
  abi: [{ type:'function', name:'withdrawEth', stateMutability:'payable',
          inputs:[{name:'destination',type:'address'}], outputs:[{type:'uint256'}] }],
  functionName: 'withdrawEth', args: [destination], value: amount,
})
```

**Phase B — wait** until confirmable (~1–2 minutes, thanks to fast confirmation).

**Phase C — claim on BSC** via `Outbox.executeTransaction(...)`, which releases SPYB from the bridge.
Building the Merkle proof is non-trivial — use `@arbitrum/sdk`.

## Using @arbitrum/sdk

SpyChain isn't a built-in Arbitrum network, so register it once at startup:

```ts
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'

registerCustomArbitrumNetwork({
  chainId: 9426,
  name: 'SPY Chain',
  parentChainId: 56,
  confirmPeriodBlocks: 192000,
  ethBridge: {
    bridge:         '0xDCB8b52949E37d459f012EB6D493F61d58e7e0d2',
    inbox:          '0x27ac1419Cf54D6a83b1C8B094c4fbBD5F83D5cE3',
    sequencerInbox: '0x31215737b9EB1dAA1E474C2F29B9af9459B6E41b',
    outbox:         '0x1B00c8efBAD92fF26e4Eeb0c94BE56A4CE18edaF',
    rollup:         '0x29Cfe431C5d431721D38dEB7367B1cad0D14096f',
  },
  nativeToken: '0x7138b48df7D98D7e3cc221BfE7192D0a178182D8',
  isCustom: true,
  isTestnet: false,
})
```

Claim a withdrawal from its SpyChain tx hash:

```ts
import { ChildTransactionReceipt } from '@arbitrum/sdk' // v4 naming

const l2Receipt = new ChildTransactionReceipt(await l2Provider.getTransactionReceipt(withdrawTxHash))
const [msg] = await l2Receipt.getChildToParentMessages(bscSigner) // ethers signer on BSC
await msg.waitUntilReadyToExecute(l2Provider) // resolves once confirmed (~1–2 min)
await msg.execute(l2Provider)                 // builds proof + sends the Outbox tx on BSC
```

> SDK **v4** uses `ChildTransactionReceipt` / `ChildToParentMessage`; **v3** uses
> `L2TransactionReceipt` / `L2ToL1Message`. Pin one version.

## Timing

| Action | Gas paid on | Time |
|---|---|---|
| Deposit | BNB Smart Chain | ~seconds |
| Withdraw — initiate | SpyChain | instant |
| Withdraw — claimable | — | ~1–2 minutes |
| Withdraw — claim | BNB Smart Chain | one transaction |

## Notes

* SPYB is 18 decimals on both sides — no conversion; transfers are 1:1.
* Approve before depositing, or the deposit reverts.
* Check `Outbox.isSpent(index)` before showing a claim button, to avoid double-claims.
* Deposit + claim run on BSC; withdraw-init runs on SpyChain — prompt wallet chain switches accordingly.
