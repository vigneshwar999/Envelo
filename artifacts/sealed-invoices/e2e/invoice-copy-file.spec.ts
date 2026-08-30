import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import {
  buildInvoiceCopyFile,
  computeFingerprint,
  type InvoiceDocument,
} from "../src/lib/crypto";

// Node-side checks of the keep-a-copy proof file - no browser, no server.
// The seal-and-send spec covers the happy path through the real UI; this
// file pins the builder's honesty rules, which cannot all be reached
// deterministically through the UI (a background anchor lands too fast to
// reliably catch an invoice in the pending state).
//
// Runs under the same Playwright suite; crypto.ts only touches localStorage
// inside functions this spec never calls, and WebCrypto/TextEncoder exist as
// Node globals.

/** Unicode-heavy document: forces real escaping/encoding decisions. */
const doc: InvoiceDocument = {
  invoiceNumber: "INV-ü-042",
  title: "Design — sprint ✓",
  freelancerName: 'Asha "Quotes" Verma',
  clientName: "Röhan Mehta",
  lineItems: [
    { description: "Wireframes ₹ tab\there", quantity: 2, unitPriceUsdc: "75.00" },
    { description: "Line\nbreak & emoji 🚀", quantity: 1, unitPriceUsdc: "120.50" },
  ],
  notes: "Thanks! — control char: \u0007 done",
  issueDate: "2026-08-29",
  dueDate: null,
  amountUsdc: "270.50",
  nonce: "a1b2c3d4e5f60718",
};

const TX = "0x" + "ab".repeat(32);
const CHAIN_ID = 5042002;
const EXPLORER = "https://testnet.arcscan.app";

test.describe("invoice-copy proof file (builder honesty rules)", () => {
  test("pending anchor: no chain-verification claim, no pointers", async () => {
    const fingerprint = await computeFingerprint(doc);
    const file = await buildInvoiceCopyFile(doc, {
      invoiceId: "inv-1",
      fingerprintOnRecord: fingerprint,
      anchorStatus: "pending",
      anchorTxHash: null,
      chainId: null,
      explorerBaseUrl: null,
    });
    expect(file.anchor.status).toBe("pending");
    expect(file.anchor.txHash).toBeNull();
    expect(file.anchor.explorerTxUrl).toBeNull();
    expect(file.howToVerify).toMatch(/NOT yet been anchored/);
    // A file with no anchor must not tell its holder to check the chain.
    expect(file.howToVerify).not.toMatch(/embedded in the Arc/);
    expect(file.howToVerify).not.toMatch(/anchor\.explorerTxUrl` to see it/);
  });

  test("anchored with full pointers: exact explorer URL + chain claim", async () => {
    const fingerprint = await computeFingerprint(doc);
    const file = await buildInvoiceCopyFile(doc, {
      invoiceId: "inv-1",
      fingerprintOnRecord: fingerprint,
      anchorStatus: "anchored",
      anchorTxHash: TX,
      chainId: CHAIN_ID,
      explorerBaseUrl: EXPLORER,
    });
    expect(file.fingerprint).toBe(fingerprint);
    expect(file.anchor.txHash).toBe(TX);
    expect(file.anchor.chainId).toBe(CHAIN_ID);
    expect(file.anchor.explorerTxUrl).toBe(`${EXPLORER}/tx/${TX}`);
    expect(file.howToVerify).toMatch(/embedded in the Arc testnet anchor transaction/);
    expect(file.howToVerify).toMatch(/RFC 8785/);
  });

  test("anchored WITHOUT its pointers: refuses to emit a contradictory file", async () => {
    const fingerprint = await computeFingerprint(doc);
    const base = {
      invoiceId: "inv-1",
      fingerprintOnRecord: fingerprint,
      anchorStatus: "anchored",
    };
    // Each missing pointer alone must block the export - an "anchored" copy
    // lacking any of them could never be checked as its wording promises.
    for (const broken of [
      { ...base, anchorTxHash: null, chainId: CHAIN_ID, explorerBaseUrl: EXPLORER },
      { ...base, anchorTxHash: TX, chainId: null, explorerBaseUrl: EXPLORER },
      { ...base, anchorTxHash: TX, chainId: CHAIN_ID, explorerBaseUrl: null },
    ]) {
      await expect(buildInvoiceCopyFile(doc, broken)).rejects.toThrow(
        /incomplete copy wasn't saved/,
      );
    }
  });

  test("document/record mismatch: refuses to export", async () => {
    await expect(
      buildInvoiceCopyFile(doc, {
        invoiceId: "inv-1",
        fingerprintOnRecord: "0".repeat(64),
        anchorStatus: "anchored",
        anchorTxHash: TX,
        chainId: CHAIN_ID,
        explorerBaseUrl: EXPLORER,
      }),
    ).rejects.toThrow(/doesn't match the sealed record/);
  });

  test("a DIFFERENT runtime reproduces the fingerprint from the documented rule alone", async () => {
    // python3 follows only what howToVerify says (RFC 8785-style dump:
    // sorted keys, no whitespace, raw unicode) - none of the app's code.
    // Keys are ASCII (fixed schema), so python's code-point key sort and
    // JS's UTF-16 sort agree; values don't affect ordering.
    const fingerprint = await computeFingerprint(doc);
    const file = await buildInvoiceCopyFile(doc, {
      invoiceId: "inv-1",
      fingerprintOnRecord: fingerprint,
      anchorStatus: "anchored",
      anchorTxHash: TX,
      chainId: CHAIN_ID,
      explorerBaseUrl: EXPLORER,
    });
    const py = [
      "import sys, json, hashlib",
      "doc = json.load(sys.stdin)",
      'canon = json.dumps(doc, sort_keys=True, separators=(",", ":"), ensure_ascii=False)',
      'print(hashlib.sha256(canon.encode("utf-8")).hexdigest())',
    ].join("\n");
    let pyDigest: string;
    try {
      pyDigest = execFileSync("python3", ["-c", py], {
        input: JSON.stringify(file.document),
        encoding: "utf8",
      }).trim();
    } catch (err) {
      throw new Error(
        `python3 is required for the cross-runtime canonicalization check: ${String(err)}`,
      );
    }
    expect(pyDigest).toBe(file.fingerprint);
  });
});
