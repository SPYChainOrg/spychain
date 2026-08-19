# Claiming Withdrawals

A SpyChain withdrawal is **two transactions**: the user's L2 `ArbSys.withdrawEth` (see
[bridge-integration.md](bridge-integration.md)), then a **claim on BNB Smart Chain** that releases the
SPYB. This page covers completing that claim — either as a manual button, or automatically via the
[relayer](../relayer/).

## The claim is permissionless

`Outbox.executeTransaction` can be submitted by anyone, and the SPYB is always released to the
**destination the user chose when they withdrew** — it is encoded in the proven message and cannot be
changed by whoever sends the claim. So a service that claims on users' behalf **only pays gas; it can
never redirect or steal funds.**

| | |
|---|---|
| Outbox (claim target) | `0x1B00c8efBAD92fF26e4Eeb0c94BE56A4CE18edaF` (BSC) |
| Withdrawal states | `UNCONFIRMED` → `CONFIRMED` (claimable) → `EXECUTED` (claimed) |
| Confirm time | ~1–2 min (fast confirmation) |

Register the network once (SpyChain isn't a built-in Arbitrum network):

```ts
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'
registerCustomArbitrumNetwork({
  chainId: 9426, name: 'SPY Chain', parentChainId: 56, confirmPeriodBlocks: 192000,
  ethBridge: {
    bridge: '0xDCB8b52949E37d459f012EB6D493F61d58e7e0d2',
    inbox:  '0x27ac1419Cf54D6a83b1C8B094c4fbBD5F83D5cE3',
    sequencerInbox: '0x31215737b9EB1dAA1E474C2F29B9af9459B6E41b',
    outbox: '0x1B00c8efBAD92fF26e4Eeb0c94BE56A4CE18edaF',
    rollup: '0x29Cfe431C5d431721D38dEB7367B1cad0D14096f',
  },
  nativeToken: '0x7138b48df7D98D7e3cc221BfE7192D0a178182D8',
  isCustom: true, isTestnet: false,
})
```

## Manual claim (from the L2 withdrawal tx hash)

Persist the L2 withdraw tx hash, poll status, and execute when `CONFIRMED`:

```ts
import { ChildTransactionReceipt, ChildToParentMessageStatus } from '@arbitrum/sdk'
import { providers } from 'ethers'

const l2 = new providers.JsonRpcProvider('https://rpc.spychain.io', 9426)

async function getMessage(withdrawTxHash, bscSigner /* ethers Signer on BSC (chain 56) */) {
  const rec = new ChildTransactionReceipt(await l2.getTransactionReceipt(withdrawTxHash))
  const [msg] = await rec.getChildToParentMessages(bscSigner)
  return msg
}

async function claim(msg) {
  if (await msg.status(l2) !== ChildToParentMessageStatus.CONFIRMED) return
  const tx = await msg.execute(l2)       // builds proof + sends Outbox.executeTransaction
  const receipt = await tx.wait()
  return receipt.transactionHash          // the bridge-out tx on BSC
}
```

UI: show the Claim button only when `status === CONFIRMED`; show "Claimed" on `EXECUTED`; the user must
be on BSC (chain 56) to claim.

> SDK **v4** naming above. On **v3** these are `L2TransactionReceipt` / `L2ToL1Message` /
> `L2ToL1MessageStatus` with `getL2ToL1Messages`.

## Auto-claim (recommended)

Run the [relayer](../relayer/) — a small service that watches for confirmed withdrawals and submits the
claim automatically, so users get **gasless one-step withdrawals** (no second signature, no BNB needed).
The withdraw UI can simply poll `status` → `EXECUTED` and show "arrived". See the
[relayer README](../relayer/README.md).
