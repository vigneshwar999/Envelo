import { describe, expect, it } from "vitest";
import { parseUnits } from "viem";
import { formatFeeUsdc } from "./arc";

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
});
