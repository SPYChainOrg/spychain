import fs from "node:fs";
import crypto from "node:crypto";
import { ethers } from "ethers";
import { ChildTransactionReceipt, ChildToParentMessageStatus } from "@arbitrum/sdk";
import { ensureRegistered } from "./network.mjs";

/**
 * SpyChain auto-claim relayer.
 * Watches SpyChain for withdrawals (ArbSys L2ToL1Tx), and once each is CONFIRMED, submits the BSC-side
 * claim (Outbox.executeTransaction) from a funded relayer wallet — so users never sign a second tx.
 * The claim is permissionless and funds always go to the destination the user chose, so this wallet
 * only ever pays gas; it cannot redirect or steal funds. Idempotent: never re-claims an EXECUTED msg.
 */
const L2_RPC = process.env.L2_RPC || "http://localhost:8449";
const BSC_RPC = process.env.BSC_RPC;
const POLL = Number(process.env.POLL_INTERVAL_MS || 45000);
const STATE_FILE = process.env.STATE_FILE || "./.state.json";
const START_BLOCK = Number(process.env.START_BLOCK || 0);
const SCAN_CHUNK = Number(process.env.SCAN_CHUNK || 5000);
if (!BSC_RPC) throw new Error("set BSC_RPC (needs eth_getLogs support — e.g. a keyed provider)");

const ARBSYS = "0x0000000000000000000000000000000000000064";
const L2TOL1_TOPIC = ethers.utils.id("L2ToL1Tx(address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes)");
const log = (...a) => console.log(new Date().toISOString(), ...a);

function loadKey() {
  if (process.env.RELAYER_PRIVATE_KEY) return process.env.RELAYER_PRIVATE_KEY;
  const encHex = process.env.RELAYER_ENC_KEY || "";
  if (!/^[0-9a-fA-F]{64}$/.test(encHex)) throw new Error("set RELAYER_PRIVATE_KEY, or RELAYER_ENC_KEY + .relayer.json (run gen-wallet.mjs)");
  const f = JSON.parse(fs.readFileSync("./.relayer.json", "utf8"));
  const d = Buffer.from(f.enc, "base64");
  const dc = crypto.createDecipheriv("aes-256-gcm", Buffer.from(encHex, "hex"), d.subarray(0, 12));
  dc.setAuthTag(d.subarray(12, 28));
  return Buffer.concat([dc.update(d.subarray(28)), dc.final()]).toString("utf8");
}

ensureRegistered();
const l2 = new ethers.providers.JsonRpcProvider(L2_RPC, 9426);
const bsc = new ethers.providers.JsonRpcProvider(BSC_RPC, 56);
const relayer = new ethers.Wallet(loadKey(), bsc);

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { lastBlock: START_BLOCK, pending: [], executed: {} }; }
}
const saveState = (s) => fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));

async function discover(state) {
  const latest = await l2.getBlockNumber();
  const seen = new Set([...state.pending, ...Object.keys(state.executed)]);
  let from = Math.max(state.lastBlock, START_BLOCK);
  while (from <= latest) {
    const to = Math.min(from + SCAN_CHUNK - 1, latest);
    const logs = await l2.getLogs({ address: ARBSYS, topics: [L2TOL1_TOPIC], fromBlock: from, toBlock: to });
    for (const lg of logs) {
      if (!seen.has(lg.transactionHash)) { state.pending.push(lg.transactionHash); seen.add(lg.transactionHash); log("discovered withdrawal", lg.transactionHash); }
    }
    from = to + 1;
  }
  state.lastBlock = latest;
}

async function processPending(state) {
  const still = [];
  for (const h of state.pending) {
    try {
      const rec = await l2.getTransactionReceipt(h);
      if (!rec) { still.push(h); continue; }
      const msgs = await new ChildTransactionReceipt(rec).getChildToParentMessages(relayer);
      let allDone = true;
      for (const m of msgs) {
        const st = await m.status(l2);
        if (st === ChildToParentMessageStatus.EXECUTED) continue;               // already claimed
        if (st === ChildToParentMessageStatus.CONFIRMED) {
          log("claiming", h, "…");
          const tx = await m.execute(l2);
          const r = await tx.wait();
          log("CLAIMED", h, "→ BSC tx", r.transactionHash);
        } else { allDone = false; }                                             // UNCONFIRMED — retry later
      }
      if (allDone) state.executed[h] = true; else still.push(h);
    } catch (e) {
      log("processing", h, "->", e?.shortMessage || e?.reason || e?.message || String(e));
      still.push(h);
    }
  }
  state.pending = still;
}

async function tick() {
  const state = loadState();
  await discover(state);
  await processPending(state);
  saveState(state);
}

(async () => {
  log("SpyChain auto-claim relayer starting");
  log("  relayer address:", relayer.address);
  log("  L2:", L2_RPC, "| BSC:", BSC_RPC.replace(/\/v2\/[^/]+/, "/v2/***"));
  try { log("  relayer BNB balance:", ethers.utils.formatEther(await relayer.getBalance())); } catch {}
  for (;;) {
    try { await tick(); } catch (e) { log("tick error:", e?.message || String(e)); }
    await new Promise((r) => setTimeout(r, POLL));
  }
})();
