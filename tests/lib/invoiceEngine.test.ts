import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDbConnect = vi.fn();
const mockUserFindById = vi.fn();
const mockInvoiceCountDocuments = vi.fn();
const mockInvoiceCreate = vi.fn();
const mockInvoiceFindByIdAndUpdate = vi.fn();

vi.mock("@/lib/connectdb", () => ({ default: mockDbConnect }));
vi.mock("@/models", () => ({ User: { findById: mockUserFindById } }));
vi.mock("@/models/invoice", () => ({
  Invoice: {
    countDocuments: mockInvoiceCountDocuments,
    create: mockInvoiceCreate,
    findByIdAndUpdate: mockInvoiceFindByIdAndUpdate,
    findById: vi.fn(),
  },
}));

function lineItem(total: number) {
  return { description: "item", quantity: 1, unitPrice: total, total };
}

describe("invoiceEngine — cent-safe totals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockUserFindById.mockResolvedValue({ _id: "seller-1" });
    mockInvoiceCountDocuments.mockResolvedValue(0);
    mockInvoiceCreate.mockImplementation((doc) => Promise.resolve(doc));
    mockInvoiceFindByIdAndUpdate.mockImplementation((_id, doc) =>
      Promise.resolve(doc),
    );
  });

  it("sums line items, applies a percent discount then tax, without float drift", async () => {
    const { invoiceEngine } = await import("@/lib/invoiceEngine");

    // Ten $0.10 line items: naive float summing drifts off $1.00.
    const invoice = await invoiceEngine.createInvoice("seller-1", {
      lineItems: Array(10).fill(null).map(() => lineItem(0.1)),
      dueDate: new Date("2026-08-01"),
      discountPercent: 10,
      taxRate: 8.5,
    });

    expect(invoice.subtotal).toBe(1);
    expect(invoice.discount).toBe(0.1); // 10% of $1.00
    // discounted subtotal = 0.90; tax = 8.5% of 0.90 = 0.0765 -> rounds to 0.08
    expect(invoice.tax).toBe(0.08);
    expect(invoice.total).toBe(0.98);
  });

  it("uses a flat discount amount instead of a percent when both could apply", async () => {
    const { invoiceEngine } = await import("@/lib/invoiceEngine");

    const invoice = await invoiceEngine.createInvoice("seller-1", {
      lineItems: [lineItem(100)],
      dueDate: new Date("2026-08-01"),
      discount: 15, // flat $15 off, ignoring discountPercent below
      discountPercent: 50,
      taxRate: 0,
    });

    expect(invoice.subtotal).toBe(100);
    expect(invoice.discount).toBe(15);
    expect(invoice.total).toBe(85);
  });

  it("defaults to no discount/tax when neither is provided", async () => {
    const { invoiceEngine } = await import("@/lib/invoiceEngine");

    const invoice = await invoiceEngine.createInvoice("seller-1", {
      lineItems: [lineItem(19.99), lineItem(5.5)],
      dueDate: new Date("2026-08-01"),
    });

    expect(invoice.subtotal).toBe(25.49);
    expect(invoice.discount).toBe(0);
    expect(invoice.tax).toBe(0);
    expect(invoice.total).toBe(25.49);
  });

  it("recalculates totals when updateInvoice changes line items", async () => {
    const { invoiceEngine } = await import("@/lib/invoiceEngine");

    const updated = await invoiceEngine.updateInvoice("invoice-1", {
      lineItems: [lineItem(50), lineItem(50)],
      taxRate: 10,
    });

    expect(updated.subtotal).toBe(100);
    expect(updated.tax).toBe(10);
    expect(updated.total).toBe(110);
  });

  it("leaves totals untouched when updateInvoice doesn't change line items", async () => {
    const { invoiceEngine } = await import("@/lib/invoiceEngine");

    await invoiceEngine.updateInvoice("invoice-1", { notes: "Thanks!" });

    const passedUpdate = mockInvoiceFindByIdAndUpdate.mock.calls[0][1];
    expect(passedUpdate).toEqual({ notes: "Thanks!" });
    expect(passedUpdate).not.toHaveProperty("subtotal");
    expect(passedUpdate).not.toHaveProperty("total");
  });
});
