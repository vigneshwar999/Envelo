import { describe, expect, it } from "vitest";
import { parseUnits } from "viem";
import {
  anchorFingerprintMatches,
  decideAffordability,
  FEE_ESTIMATE_FALLBACK_WEI,
  formatFeeUsdc,
} from "./arc";

// The approval sheet's one honesty-critical formatter: a POSITIVE fee must
// never be displayed as "0". Below display precision it says so explicitly.

describe("formatFeeUsdc", () => {
  it("renders exact zero as 0", () => {
    expect(formatFeeUsdc(0n)).toBe("0");
  });

  it("never renders a positive amount as 0 - one wei floors to <0.00000001", () => {
    expect(formatFeeUsdc(1n)).toBe("<0.00000001");
  });

  it("floors everything just below the 8-decimal threshold", () => {
    expect(formatFeeUsdc(parseUnits("0.00000001", 18) - 1n)).toBe("<0.00000001");
  });

  it("shows the threshold value itself exactly", () => {
    expect(formatFeeUsdc(parseUnits("0.00000001", 18))).toBe("0.00000001");
  });

  it("truncates deeper precision toward zero without flooring to nothing", () => {
    // 0.000000015 has 9 decimals; the displayed 8 keep the leading digit.
    expect(formatFeeUsdc(parseUnits("0.000000015", 18))).toBe("0.00000001");
  });

  it("trims trailing zeros from a typical anchor fee", () => {
    expect(formatFeeUsdc(parseUnits("0.00160000", 18))).toBe("0.0016");
  });

  it("keeps full 8-decimal estimates intact", () => {
    expect(formatFeeUsdc(parseUnits("0.00160532", 18))).toBe("0.00160532");
  });

  it("handles whole and mixed amounts", () => {
    expect(formatFeeUsdc(parseUnits("3", 18))).toBe("3");
    expect(formatFeeUsdc(parseUnits("1.5", 18))).toBe("1.5");
  });

  it("uses the permanent 0.1 USDC fallback when a live estimate is unavailable", () => {
    expect(FEE_ESTIMATE_FALLBACK_WEI).toBe(parseUnits("0.1", 18));
    expect(formatFeeUsdc(FEE_ESTIMATE_FALLBACK_WEI)).toBe("0.1");
  });
});

describe("payer-funded transaction affordability", () => {
  const invoiceAmount = parseUnits("1", 18);
  const required = invoiceAmount + FEE_ESTIMATE_FALLBACK_WEI;

  it("accepts a built-in wallet that covers the invoice plus the 0.1 fallback exactly", () => {
    expect(decideAffordability(required, required)).toEqual({
      canAfford: true,
      shortfallWei: 0n,
    });
    expect(formatFeeUsdc(required)).toBe("1.1");
  });

  it("reports the exact shortfall when the built-in wallet cannot cover invoice plus fee", () => {
    const decision = decideAffordability(parseUnits("1.09", 18), required);
    expect(decision.canAfford).toBe(false);
    expect(formatFeeUsdc(decision.shortfallWei)).toBe("0.01");
  });
});

describe("anchor fingerprint integrity", () => {
  it("accepts only the exact fingerprint, ignoring hex casing", () => {
    expect(anchorFingerprintMatches("aabb", "AABB")).toBe(true);
    expect(anchorFingerprintMatches("aabb", "aabc")).toBe(false);
    expect(anchorFingerprintMatches(null, "aabb")).toBe(false);
  });
});
