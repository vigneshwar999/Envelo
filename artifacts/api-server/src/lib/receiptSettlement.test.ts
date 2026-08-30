import { describe, expect, it } from "vitest";
import {
  decideSettlement,
  NEVER_BROADCAST_WINDOW_MS,
} from "./receiptSettlement";

// The scenarios the completion review called out, pinned as a decision table.
const FRESH = 5_000; // well inside the never-broadcast window
const STALE = NEVER_BROADCAST_WINDOW_MS + 1;

describe("decideSettlement", () => {
  it("lists a transfer the chain confirmed, no matter how late (accepted-then-RPC-error recovery)", () => {
    // A broadcast that threw (timeout/connection reset) but was actually
    // accepted leaves a "sending" row; once the chain shows the receipt,
    // it must become a visible confirmed receipt - even long after.
    expect(decideSettlement("confirmed", FRESH)).toBe("confirmed");
    expect(decideSettlement("confirmed", STALE)).toBe("confirmed");
  });

  it("marks a reverted transaction failed (mined but moved nothing)", () => {
    expect(decideSettlement("reverted", FRESH)).toBe("failed");
    expect(decideSettlement("reverted", STALE)).toBe("failed");
  });

  it("waits while a never-seen hash is still fresh (it may just be propagating)", () => {
    expect(decideSettlement("notfound", FRESH)).toBeNull();
    expect(decideSettlement("notfound", NEVER_BROADCAST_WINDOW_MS)).toBeNull();
  });

  it("fails a hash the chain has never seen once well past finality", () => {
    expect(decideSettlement("notfound", STALE)).toBe("failed");
  });

  it("decides nothing while the chain cannot be asked", () => {
    // In doubt, claim nothing - an RPC outage must never flip a receipt.
    expect(decideSettlement("unreachable", FRESH)).toBeNull();
    expect(decideSettlement("unreachable", STALE)).toBeNull();
  });
});
