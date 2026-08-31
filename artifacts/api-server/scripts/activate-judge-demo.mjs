// Activate the Envelo judge demo on PRODUCTION (https://envelo.replit.app).
//
// PREREQUISITE: the POST /api/demo/bootstrap route must be live in prod — it ships
// with the task merge that added this script, so the user must Republish first.
// Probe: POST $PROD/api/demo/bootstrap with a wrong x-demo-bootstrap-token header.
//   403 = endpoint live, proceed. 401 ("Please sign in…") = old build still serving.
// Verify a republish actually happened via a fresh build id (listDeploymentBuilds),
// not via user confirmation alone (see .agents/memory/task-deployment-isolation.md).
//
// Auth: the guarded /api/demo/bootstrap endpoint; token = sha256 hex of SESSION_SECRET
// (assumes the deployment's SESSION_SECRET matches the workspace one; a 403 with the
// correct token means they differ — fix secrets parity in the Publishing pane).
//
// Run from artifacts/api-server (so viem resolves): STAGE=<stage> node scripts/activate-judge-demo.mjs
// Stages, in order (each is idempotent-ish; state carries over in /tmp/envelo-prod-state.json):
//   accounts — provision riya/arjun/meera @example.com in prod Clerk, mint session JWTs,
//              sync profiles + browser-side RSA keys, create custodial wallets
//   fund     — move test USDC from the OWNER's custodial wallet (key read from dev DB via
//              psql; prod DB shares wallet rows forked at publish): riya 1.0, arjun 5.0,
//              meera 0.5, operator 3.0 (~9.5 total; disclosed to the user beforehand)
//   loop     — Riya seals + anchors invoice ENV-2026-0001 (1.00 USDC) to Arjun, waits for
//              anchored, Arjun pays, Riya grants Meera 30d view; all three decrypt + verify
//   kit      — write passphrase-locked key backups to attached_assets/envelo-demo-kit/
//              (passphrase arc-builder-2026; README.md there is pre-written)
// STAGE=all runs everything, but stage-by-stage keeps each run under shell timeouts.
// AFTER the kit stage succeeds: disable the bootstrap route by setting
// DEMO_BOOTSTRAP_DISABLED=1 in the deployment's secrets (route 404s from then on).
// Never prints private keys or secrets.
import { execSync } from "node:child_process";
import { createHash, webcrypto as wc } from "node:crypto";
import fs from "node:fs";
import {
  createPublicClient, createWalletClient, defineChain, http, parseUnits, formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PROD = "https://envelo.replit.app";
const RPC = "https://rpc.testnet.arc.io";
const STAGE = process.env.STAGE || "all";
const KIT_DIR = "/home/runner/workspace/attached_assets/envelo-demo-kit";
const STATE_FILE = "/tmp/envelo-prod-state.json";
const PASSPHRASE = "arc-builder-2026";
const OPERATOR = "0x209F726551b81b4D7BC8bec1e8763652e9282347";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) throw new Error("SESSION_SECRET missing");
const BOOT_TOKEN = createHash("sha256").update(SESSION_SECRET).digest("hex");

const arcTestnet = defineChain({
  id: 5042002, name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});
const pub = createPublicClient({ chain: arcTestnet, transport: http(RPC, { timeout: 15000 }) });

const ACCOUNTS = [
  { slug: "riya",  email: "riya@example.com",  first: "Riya",  last: "Sharma", role: "freelancer" },
  { slug: "arjun", email: "arjun@example.com", first: "Arjun", last: "Mehta",  role: "client" },
  { slug: "meera", email: "meera@example.com", first: "Meera", last: "Iyer",   role: "accountant" },
];

const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : { users: {} };
const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

// ---------- helpers ----------
const b64 = (buf) => Buffer.from(buf).toString("base64");
const fromB64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

async function bootstrap(mode) {
  const res = await fetch(`${PROD}/api/demo/bootstrap`, {
    method: "POST",
    headers: { "x-demo-bootstrap-token": BOOT_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(mode ? { mode } : {}),
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(`bootstrap(${mode ?? "provision"}) failed ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

// Session tokens: minted in batches of 3 by the bootstrap endpoint (ttl ~300s).
let tokenBatch = { at: 0, byUserId: {} };
async function sessionToken(clerkUserId) {
  if (Date.now() - tokenBatch.at > 240_000 || !tokenBatch.byUserId[clerkUserId]) {
    const out = await bootstrap("tokens");
    tokenBatch = { at: Date.now(), byUserId: {} };
    for (const t of out.tokens) tokenBatch.byUserId[t.userId] = t.jwt;
  }
  const jwt = tokenBatch.byUserId[clerkUserId];
  if (!jwt) throw new Error(`no session token for ${clerkUserId}`);
  return jwt;
}

async function api(clerkUserId, method, path, body) {
  const jwt = await sessionToken(clerkUserId);
  const res = await fetch(`${PROD}/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, ok: res.ok, body: json };
}

// canonical stringify: objects get sorted keys, arrays keep order, no whitespace
function canon(v) {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object")
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  return JSON.stringify(v);
}
async function sha256hex(str) {
  const d = await wc.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const RSA = { name: "RSA-OAEP", hash: "SHA-256" };
async function genKeys() {
  const kp = await wc.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["encrypt", "decrypt"],
  );
  const pubJwk = JSON.stringify(await wc.subtle.exportKey("jwk", kp.publicKey));
  const privJwk = JSON.stringify(await wc.subtle.exportKey("jwk", kp.privateKey));
  return { pubJwk, privJwk };
}
const importPub = (jwkStr) => wc.subtle.importKey("jwk", JSON.parse(jwkStr), RSA, false, ["encrypt"]);
const importPriv = (jwkStr) => wc.subtle.importKey("jwk", JSON.parse(jwkStr), RSA, false, ["decrypt"]);
async function wrapAesFor(rawAes, pubJwkStr) {
  const key = await importPub(pubJwkStr);
  return b64(await wc.subtle.encrypt({ name: "RSA-OAEP" }, key, rawAes));
}
async function unwrapAes(wrappedB64, privJwkStr) {
  const key = await importPriv(privJwkStr);
  return new Uint8Array(await wc.subtle.decrypt({ name: "RSA-OAEP" }, key, fromB64(wrappedB64)));
}
async function aesSeal(rawAes, plaintext) {
  const key = await wc.subtle.importKey("raw", rawAes, "AES-GCM", false, ["encrypt"]);
  const iv = wc.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await wc.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)));
  const joined = new Uint8Array(iv.length + ct.length);
  joined.set(iv); joined.set(ct, iv.length);
  return b64(joined);
}
async function aesOpen(rawAes, ciphertextB64) {
  const bytes = fromB64(ciphertextB64);
  const key = await wc.subtle.importKey("raw", rawAes, "AES-GCM", false, ["decrypt"]);
  const pt = await wc.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return new TextDecoder().decode(pt);
}
const hexNonce = () => [...wc.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");

// ---------- stages ----------
async function stageAccounts() {
  console.log("== accounts ==");
  const prov = await bootstrap();
  console.log("  keyKind:", prov.keyKind, "(must be live)");
  if (prov.keyKind !== "live") throw new Error("bootstrap hit a non-production Clerk instance");
  for (const a of ACCOUNTS) {
    const u = prov.users.find((x) => x.email === a.email);
    if (!u) throw new Error(`bootstrap did not return ${a.email}`);
    state.users[a.slug] = { ...(state.users[a.slug] ?? {}), clerkId: u.userId, email: a.email, created: u.created, emailVerified: u.emailVerified };
    console.log(`  ${a.slug}: ${u.userId} created=${u.created} verified=${u.emailVerified}`);
  }
  saveState();

  // register encryption keys + create prod rows via the real sync endpoint
  for (const a of ACCOUNTS) {
    const su = state.users[a.slug];
    if (!su.pubJwk) {
      const { pubJwk, privJwk } = await genKeys();
      su.pubJwk = pubJwk; su.privJwk = privJwk; saveState();
    }
    const sync = await api(su.clerkId, "POST", "/users/me/sync", {
      displayName: `${a.first} ${a.last}`, email: a.email, publicKeyJwk: su.pubJwk,
    });
    if (!sync.ok) throw new Error(`sync ${a.slug} failed ${sync.status}: ${JSON.stringify(sync.body).slice(0, 400)}`);
    const me = sync.body.user;
    su.walletAddress = me.walletAddress ?? null;
    su.registeredKeyMatches = me.publicKeyJwk === su.pubJwk;
    console.log(`  ${a.slug}: synced user=${me.id} wallet=${su.walletAddress} keyMatches=${su.registeredKeyMatches}`);
    if (!su.registeredKeyMatches) {
      console.log(`  WARNING: ${a.slug} already had a different registered key (server refuses overwrite).`);
    }
    saveState();
  }
}

async function stageFund() {
  console.log("== fund ==");
  const sourceKey = execSync(
    `psql "$DATABASE_URL" -tAc "SELECT private_key FROM chain_wallets WHERE id='user_3IdObxhB6zsfsSccjQlyB8yhVA1'"`,
    { encoding: "utf8" },
  ).trim();
  if (!sourceKey.startsWith("0x")) throw new Error("source wallet key not found in dev DB");
  const account = privateKeyToAccount(sourceKey);
  console.log("  source (owner custodial wallet):", account.address);
  const wallet = createWalletClient({ account, chain: arcTestnet, transport: http(RPC, { timeout: 15000 }) });
  const targets = [
    { label: "riya",     to: state.users.riya?.walletAddress,  usdc: "1.0" },
    { label: "arjun",    to: state.users.arjun?.walletAddress, usdc: "5.0" },
    { label: "meera",    to: state.users.meera?.walletAddress, usdc: "0.5" },
    { label: "operator", to: OPERATOR, usdc: "3.0" },
  ];
  for (const t of targets) {
    if (!t.to) throw new Error(`no wallet address for ${t.label}`);
    const bal = await pub.getBalance({ address: t.to });
    const want = parseUnits(t.usdc, 18);
    if (bal >= want) { console.log(`  ${t.label} already holds ${formatUnits(bal, 18)} USDC, skip`); continue; }
    const hash = await wallet.sendTransaction({ to: t.to, value: want - bal });
    const rec = await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
    console.log(`  ${t.label} <- ${formatUnits(want - bal, 18)} USDC tx=${hash} status=${rec.status}`);
    state.funding = state.funding ?? [];
    state.funding.push({ label: t.label, to: t.to, usdc: formatUnits(want - bal, 18), tx: hash });
    saveState();
  }
  const srcAfter = await pub.getBalance({ address: account.address });
  console.log("  source balance after:", formatUnits(srcAfter, 18), "USDC");
  state.sourceAddress = account.address;
  state.sourceAfter = formatUnits(srcAfter, 18);
  saveState();
}

async function stageLoop() {
  console.log("== loop ==");
  const riya = state.users.riya, arjun = state.users.arjun, meera = state.users.meera;

  if (state.invoiceId && state.paid && state.grantId) { console.log("  showcase invoice already done:", state.invoiceId); }

  if (!state.invoiceId) {
    const nonce = hexNonce();
    const today = new Date();
    const due = new Date(Date.now() + 30 * 86400_000);
    const doc = {
      invoiceNumber: "ENV-2026-0001",
      title: "Arc Builder Program - live demo invoice",
      freelancerName: "Riya Sharma",
      clientName: "Arjun Mehta",
      lineItems: [{ description: "Brand illustration set (3 concepts, sealed demo)", quantity: 1, unitPriceUsdc: "1.00" }],
      notes: "Sealed with Envelo. Only the fingerprint of this document is on Arc Testnet.",
      issueDate: today.toISOString(),
      dueDate: due.toISOString(),
      amountUsdc: "1.00",
      nonce,
    };
    const canonical = canon(doc);
    const fingerprint = await sha256hex(canonical);
    const rawAes = wc.getRandomValues(new Uint8Array(32));
    const ciphertext = await aesSeal(rawAes, canonical);
    const wrappedKeys = [
      { userId: riya.clerkId, wrappedKey: await wrapAesFor(rawAes, riya.pubJwk) },
      { userId: arjun.clerkId, wrappedKey: await wrapAesFor(rawAes, arjun.pubJwk) },
    ];
    state.rawAesB64 = b64(rawAes); state.fingerprint = fingerprint; state.docCanonical = canonical; saveState();
    const create = await api(riya.clerkId, "POST", "/invoices", {
      clientId: arjun.clerkId, amountUsdc: "1.00", fingerprint, ciphertext, wrappedKeys,
      invoiceNumber: doc.invoiceNumber, creatorPublicKeyJwk: riya.pubJwk, clientPublicKeyJwk: arjun.pubJwk,
      dueDate: due.toISOString(),
    });
    if (!create.ok) throw new Error(`create failed ${create.status}: ${JSON.stringify(create.body).slice(0, 500)}`);
    state.invoiceId = create.body.id;
    console.log("  created invoice", state.invoiceId, "status:", create.body.status, "anchorStatus:", create.body.anchorStatus);
    saveState();
  }

  // poll anchor
  let inv;
  for (let i = 0; i < 40; i++) {
    const r = await api(riya.clerkId, "GET", `/invoices/${state.invoiceId}`);
    inv = r.body;
    if (inv.anchorStatus === "anchored") break;
    await new Promise((res) => setTimeout(res, 4000));
  }
  console.log("  anchorStatus:", inv.anchorStatus, "anchorTx:", inv.anchorTxHash ?? null);
  if (inv.anchorStatus !== "anchored") throw new Error("anchor did not confirm in time");
  state.anchorTxHash = inv.anchorTxHash; saveState();

  // pay as Arjun
  if (!state.paid) {
    const pay = await api(arjun.clerkId, "POST", `/invoices/${state.invoiceId}/pay`);
    if (!pay.ok) throw new Error(`pay failed ${pay.status}: ${JSON.stringify(pay.body).slice(0, 500)}`);
    console.log("  paid. status:", pay.body.status, "payTx:", pay.body.payTxHash);
    state.paid = true; state.payTxHash = pay.body.payTxHash; saveState();
  }

  // grant to Meera (30 days)
  if (!state.grantId) {
    const rawAes = fromB64(state.rawAesB64);
    const grant = await api(riya.clerkId, "POST", `/invoices/${state.invoiceId}/grants`, {
      granteeId: meera.clerkId,
      expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
      wrappedKey: await wrapAesFor(rawAes, meera.pubJwk),
      granteePublicKeyJwk: meera.pubJwk,
    });
    if (!grant.ok) throw new Error(`grant failed ${grant.status}: ${JSON.stringify(grant.body).slice(0, 500)}`);
    state.grantId = grant.body.id;
    console.log("  granted to Meera:", state.grantId, "expires:", grant.body.expiresAt);
    saveState();
  }

  // envelope opens for all three via their own wrapped copies
  for (const [slug, su] of [["riya", riya], ["arjun", arjun], ["meera", meera]]) {
    const env = await api(su.clerkId, "GET", `/invoices/${state.invoiceId}/envelope`);
    if (!env.ok) throw new Error(`${slug} envelope failed ${env.status}`);
    const aes = await unwrapAes(env.body.wrappedKey, su.privJwk);
    const opened = await aesOpen(aes, env.body.ciphertext);
    const okDoc = opened === state.docCanonical;
    console.log(`  envelope ${slug}: source=${env.body.accessSource} decrypts=${okDoc}`);
    if (!okDoc) throw new Error(`${slug} decrypted document mismatch`);
  }

  // verify for all three: record + onchain must both match
  for (const [slug, su] of [["riya", riya], ["arjun", arjun], ["meera", meera]]) {
    const v = await api(su.clerkId, "POST", `/invoices/${state.invoiceId}/verify`, { computedFingerprint: state.fingerprint });
    if (!v.ok) throw new Error(`${slug} verify failed ${v.status}`);
    console.log(`  verify ${slug}: record=${v.body.matchesRecord} onchain=${v.body.matchesOnchain}`);
    if (!v.body.matchesRecord || v.body.matchesOnchain !== true) throw new Error(`${slug} verification not fully green`);
  }

  // final balances
  for (const [label, addr] of [
    ["riya", riya.walletAddress], ["arjun", arjun.walletAddress],
    ["meera", meera.walletAddress], ["operator", OPERATOR],
  ]) {
    const bal = await pub.getBalance({ address: addr });
    console.log(`  balance ${label}: ${formatUnits(bal, 18)} USDC`);
  }
}

async function stageKit() {
  console.log("== kit ==");
  fs.mkdirSync(KIT_DIR, { recursive: true });
  for (const a of ACCOUNTS) {
    const su = state.users[a.slug];
    const salt = wc.getRandomValues(new Uint8Array(16));
    const iv = wc.getRandomValues(new Uint8Array(12));
    const baseKey = await wc.subtle.importKey("raw", new TextEncoder().encode(PASSPHRASE), "PBKDF2", false, ["deriveKey"]);
    const aesKey = await wc.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: 310000 },
      baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"],
    );
    const locked = new Uint8Array(await wc.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, new TextEncoder().encode(su.privJwk)));
    const backup = {
      app: "sealed-invoices", kind: "envelope-key-backup", version: 1,
      userId: su.clerkId, createdAt: new Date().toISOString(),
      publicKeyJwk: su.pubJwk,
      kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 310000, saltB64: b64(salt) },
      cipher: { name: "AES-GCM", ivB64: b64(iv) },
      lockedPrivateKeyB64: b64(locked),
    };
    const file = `${KIT_DIR}/${a.slug}-envelope-key.json`;
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
    console.log("  wrote", file);
  }
  console.log("  passphrase:", PASSPHRASE);
}

const run = async () => {
  if (["all", "accounts"].includes(STAGE)) await stageAccounts();
  if (["all", "fund"].includes(STAGE)) await stageFund();
  if (["all", "loop"].includes(STAGE)) await stageLoop();
  if (["all", "kit"].includes(STAGE)) await stageKit();
  console.log("DONE. summary:", JSON.stringify({
    invoiceId: state.invoiceId, anchorTx: state.anchorTxHash, payTx: state.payTxHash,
    grantId: state.grantId, funding: state.funding, source: state.sourceAddress, sourceAfter: state.sourceAfter,
    users: Object.fromEntries(Object.entries(state.users).map(([k, v]) => [k, { clerkId: v.clerkId, wallet: v.walletAddress }])),
  }, null, 2));
};
run().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
