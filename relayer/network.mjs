import { registerCustomArbitrumNetwork } from "@arbitrum/sdk";

// SpyChain (chain 9426) settling to BNB Smart Chain (56). Registered so @arbitrum/sdk can build
// withdrawal (child->parent) proofs and submit outbox claims. Only ethBridge + confirmPeriodBlocks
// are needed for withdrawals; tokenBridge is omitted (native SPYB only).
export const SPYCHAIN = {
  chainId: 9426,
  name: "SPY Chain",
  parentChainId: 56,
  confirmPeriodBlocks: 192000,
  ethBridge: {
    bridge: "0xDCB8b52949E37d459f012EB6D493F61d58e7e0d2",
    inbox: "0x27ac1419Cf54D6a83b1C8B094c4fbBD5F83D5cE3",
    sequencerInbox: "0x31215737b9EB1dAA1E474C2F29B9af9459B6E41b",
    outbox: "0x1B00c8efBAD92fF26e4Eeb0c94BE56A4CE18edaF",
    rollup: "0x29Cfe431C5d431721D38dEB7367B1cad0D14096f",
  },
  nativeToken: "0x7138b48df7D98D7e3cc221BfE7192D0a178182D8",
  isCustom: true,
  isTestnet: false,
};

let registered = false;
export function ensureRegistered() {
  if (registered) return SPYCHAIN;
  try {
    registerCustomArbitrumNetwork(SPYCHAIN);
  } catch (e) {
    // already registered (e.g. re-import) — safe to ignore
    if (!/already/i.test(String(e?.message))) throw e;
  }
  registered = true;
  return SPYCHAIN;
}
