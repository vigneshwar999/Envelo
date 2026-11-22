import { afterEach, describe, expect, it } from "vitest";
import {
  ARC_MAINNET,
  liveInvoiceCapBlocker,
  mainnetDailyInvoiceCapPerUser,
  mainnetHourlyInvoiceCapGlobal,
} from "./networks";

// Envelo's operator wallet pays every live anchor, so live creation is capped.
describe("live invoice cap", () => {
  const base = { userLast24h: 0, allLastHour: 0, userCap: 10, globalCap: 60 };

  it("allows creation under both caps", () => {
    expect(liveInvoiceCapBlocker(base)).toBeNull();
    expect(liveInvoiceCapBlocker({ ...base, userLast24h: 9, allLastHour: 59 })).toBeNull();
  });

  it("blocks a sender at their 24-hour cap", () => {
    expect(liveInvoiceCapBlocker({ ...base, userLast24h: 10 })).toMatch(/up to 10 live invoices per 24 hours/);
  });

  it("blocks everyone at the hourly global cap", () => {
    expect(liveInvoiceCapBlocker({ ...base, allLastHour: 60 })).toMatch(/limited per hour/);
  });

  it("a cap of 0 blocks all live creation", () => {
    expect(liveInvoiceCapBlocker({ ...base, userCap: 0 })).not.toBeNull();
  });
});

describe("cap settings", () => {
  afterEach(() => {
    delete process.env["ARC_MAINNET_DAILY_INVOICE_CAP"];
    delete process.env["ARC_MAINNET_HOURLY_INVOICE_CAP"];
  });

  it("defaults to 10 per sender per day and 60 per hour overall", () => {
    expect(mainnetDailyInvoiceCapPerUser()).toBe(10);
    expect(mainnetHourlyInvoiceCapGlobal()).toBe(60);
  });

  it("reads whole-number overrides and ignores junk", () => {
    process.env["ARC_MAINNET_DAILY_INVOICE_CAP"] = "3";
    process.env["ARC_MAINNET_HOURLY_INVOICE_CAP"] = "abc";
    expect(mainnetDailyInvoiceCapPerUser()).toBe(3);
    expect(mainnetHourlyInvoiceCapGlobal()).toBe(60);
  });
});

describe("mainnet registry", () => {
  it("points at the deployed v4 registry", () => {
    expect(ARC_MAINNET.registryAddress?.toLowerCase()).toBe(
      "0xa27cc871eee4a86ed5c5cb3f11315bff4ca2e338",
    );
  });
});
