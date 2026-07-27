import { describe, expect, it } from "vitest";
import {
  addMoney,
  applyPercentage,
  fromCents,
  roundMoney,
  subtractMoney,
  sumMoney,
  toCents,
} from "@/lib/money";

describe("money helpers", () => {
  it("converts dollars to cents and back without drift", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(fromCents(1999)).toBe(19.99);
  });

  it("rounds to the nearest cent", () => {
    expect(roundMoney(19.999)).toBe(20);
    expect(roundMoney(19.994)).toBe(19.99);
  });

  it("adds without the classic 0.1 + 0.2 float drift", () => {
    expect(0.1 + 0.2).not.toBe(0.3); // sanity check the bug this fixes
    expect(addMoney(0.1, 0.2)).toBe(0.3);
  });

  it("subtracts without float drift", () => {
    expect(subtractMoney(1, 0.9)).toBe(0.1);
  });

  it("sums a list of invoice-style line items to the exact total", () => {
    const lineItems = [19.99, 5.5, 3.33, 0.01, 10.17];
    expect(sumMoney(lineItems)).toBe(39);
  });

  it("sums without accumulating the classic repeated-decimal drift", () => {
    const tenDimes = Array(10).fill(0.1);

    // Naive float addition drifts on this exact set — this is the failure
    // mode the helper exists to avoid.
    const naive = tenDimes.reduce((a, b) => a + b, 0);
    expect(naive).not.toBe(1);

    expect(sumMoney(tenDimes)).toBe(1);
  });

  it("applies a percentage (tax/discount) rounding in cents", () => {
    expect(applyPercentage(100, 8.5)).toBe(8.5);
    expect(applyPercentage(19.99, 10)).toBe(2);
  });

  it("handles zero and negative amounts", () => {
    expect(addMoney(0, 0)).toBe(0);
    expect(subtractMoney(5, 10)).toBe(-5);
    expect(sumMoney([])).toBe(0);
  });
});
