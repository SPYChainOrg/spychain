import fs from "node:fs";
import crypto from "node:crypto";
import { ethers } from "ethers";

// Generate the relayer hot wallet (gas-only), AES-256-GCM encrypted under a fresh RELAYER_ENC_KEY.
// Prints the address to fund with BNB and the RELAYER_ENC_KEY to put in relayer.env. Never overwrites.
if (fs.existsSync("./.relayer.json")) { console.error(".relayer.json already exists — refusing to overwrite"); process.exit(1); }

const w = ethers.Wallet.createRandom();
const encKey = crypto.randomBytes(32);
const iv = crypto.randomBytes(12);
const c = crypto.createCipheriv("aes-256-gcm", encKey, iv);
const ct = Buffer.concat([c.update(w.privateKey, "utf8"), c.final()]);
const enc = Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");

fs.writeFileSync("./.relayer.json", JSON.stringify({ address: w.address, enc }, null, 2));
fs.chmodSync("./.relayer.json", 0o600);

console.log("RELAYER_ADDRESS=" + w.address);
console.log("RELAYER_ENC_KEY=" + encKey.toString("hex"));
console.log("\n-> Fund RELAYER_ADDRESS with a little BNB (gas only).");
console.log("-> Put RELAYER_ENC_KEY into relayer.env (never commit it).");
