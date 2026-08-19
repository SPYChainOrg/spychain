import { ethers } from "ethers";
import { ChildTransactionReceipt, ChildToParentMessageStatus } from "@arbitrum/sdk";
import { ensureRegistered } from "./network.mjs";

// Read-only: report the outbox status of one or more L2 withdrawal tx hashes. No wallet, no execute.
//   L2_RPC=http://localhost:8449 BSC_RPC=https://bsc-dataseed.bnbchain.org node dryrun.mjs <l2txhash...>
const L2_RPC = process.env.L2_RPC || "http://localhost:8449";
const BSC_RPC = process.env.BSC_RPC || "https://bsc-dataseed.bnbchain.org";
const l2 = new ethers.providers.JsonRpcProvider(L2_RPC, 9426);
const bsc = new ethers.providers.JsonRpcProvider(BSC_RPC, 56);
ensureRegistered();

const STATUS = { [ChildToParentMessageStatus.UNCONFIRMED]: "UNCONFIRMED", [ChildToParentMessageStatus.CONFIRMED]: "CONFIRMED (claimable)", [ChildToParentMessageStatus.EXECUTED]: "EXECUTED (claimed)" };

const hashes = process.argv.slice(2);
if (!hashes.length) { console.error("usage: node dryrun.mjs <l2txhash...>"); process.exit(1); }

for (const h of hashes) {
  try {
    const rec = await l2.getTransactionReceipt(h);
    if (!rec) { console.log(`${h}  -> receipt not found`); continue; }
    const l2rec = new ChildTransactionReceipt(rec);
    const msgs = await l2rec.getChildToParentMessages(bsc); // provider = read-only
    if (!msgs.length) { console.log(`${h}  -> no child->parent messages (not a withdrawal?)`); continue; }
    for (const m of msgs) {
      const st = await m.status(l2);
      console.log(`${h}  -> ${STATUS[st] ?? st}`);
    }
  } catch (e) {
    console.log(`${h}  -> ERROR: ${e?.shortMessage || e?.message || e}`);
  }
}
