import { describe, expect, it } from "vitest";
import { parseUnits } from "viem";
import { decideSendAmount, SWEEP_GAS_RESERVE_WEI } from "./arc";

// The reserve rule in one place: whatever leaves a custodial wallet, the gas
// reserve stays behind. These are the boundaries the withdraw route and the
// sweep both rely on.

const usdc = (v: string) => parseUnits(v, 18);

describe("decideSendAmount", () => {
  it("max sends everything above the reserve", () => {
    const decision = decideSendAmount(usdc("1.05"), "max");
    expect(decision).toEqual({ ok: true, amountWei: usdc("1") });
  });

  it("max refuses when the balance is at or below the reserve", () => {
    expect(decideSendAmount(SWEEP_GAS_RESERVE_WEI, "max")).toEqual({
      ok: false,
      maxWei: 0n,
    });
    expect(decideSendAmount(usdc("0.01"), "max")).toEqual({
      ok: false,
      maxWei: 0n,
    });
  });

  it("an explicit amount exactly at balance-minus-reserve is allowed", () => {
    const decision = decideSendAmount(usdc("2.05"), usdc("2"));
    expect(decision).toEqual({ ok: true, amountWei: usdc("2") });
  });

  it("one wei past the ceiling is refused, with the real ceiling reported", () => {
    const decision = decideSendAmount(usdc("2.05"), usdc("2") + 1n);
    expect(decision).toEqual({ ok: false, maxWei: usdc("2") });
  });

  it("zero and negative requests are refused", () => {
    expect(decideSendAmount(usdc("5"), 0n)).toEqual({
      ok: false,
      maxWei: usdc("4.95"),
    });
    expect(decideSendAmount(usdc("5"), -1n)).toEqual({
      ok: false,
      maxWei: usdc("4.95"),
    });
  });

  it("a balance below the reserve reports a ceiling of zero", () => {
    expect(decideSendAmount(usdc("0.04"), usdc("0.01"))).toEqual({
      ok: false,
      maxWei: 0n,
    });
  });
});
