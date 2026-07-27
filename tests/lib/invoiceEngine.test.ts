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

// Payload shape callers (API routes, and through them the frontend) have
// always sent — plain dollar amounts. lib/invoiceEngine.ts converts these
// to integer cents before they ever reach Invoice.create/findByIdAndUpdate
// (see models/invoice.ts — R-31).
function lineItem(total: number) {
  return { description: "item", quantity: 1, unitPrice: total, total };
}

describe("invoiceEngine — cent-safe totals, stored as integer cents", () => {
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

  it("accepts a dollar-denominated payload but stores integer cents", async () => {
    const { invoiceEngine } = await import("@/lib/invoiceEngine");

    // Ten $0.10 line items: naive float summing drifts off $1.00.
    const invoice = await invoiceEngine.createInvoice("seller-1", {
      lineItems: Array(10).fill(null).map(() => lineItem(0.1)),
      dueDate: new Date("2026-08-01"),
      discountPercent: 10,
      taxRate: 8.5,
    });

    expect(invoice.subtotalCents).toBe(100);
    expect(invoice.discountCents).toBe(10); // 10% of $1.00 = $0.10 = 10 cents
    // discounted subtotal = $0.90; tax = 8.5% of $0.90 = $0.0765 -> rounds to $0.08 = 8 cents
    expect(invoice.taxCents).toBe(8);
    expect(invoice.totalCents).toBe(98);
    // Line items are converted to the stored (cents) shape too.
    expect(invoice.lineItems[0].unitPriceCents).toBe(10);
    expect(invoice.lineItems[0].totalCents).toBe(10);
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

    expect(invoice.subtotalCents).toBe(10000);
    expect(invoice.discountCents).toBe(1500);
    expect(invoice.totalCents).toBe(8500);
  });

  it("defaults to no discount/tax when neither is provided", async () => {
    const { invoiceEngine } = await import("@/lib/invoiceEngine");

    const invoice = await invoiceEngine.createInvoice("seller-1", {
      lineItems: [lineItem(19.99), lineItem(5.5)],
      dueDate: new Date("2026-08-01"),
    });

    expect(invoice.subtotalCents).toBe(2549);
    expect(invoice.discountCents).toBe(0);
    expect(invoice.taxCents).toBe(0);
    expect(invoice.totalCents).toBe(2549);
  });

  it("recalculates totals (in cents) when updateInvoice changes line items", async () => {
    const { invoiceEngine } = await import("@/lib/invoiceEngine");

    const updated = await invoiceEngine.updateInvoice("invoice-1", {
      lineItems: [lineItem(50), lineItem(50)],
      taxRate: 10,
    });

    expect(updated.subtotalCents).toBe(10000);
    expect(updated.taxCents).toBe(1000);
    expect(updated.totalCents).toBe(11000);
  });

  it("leaves totals untouched when updateInvoice doesn't change line items", async () => {
    const { invoiceEngine } = await import("@/lib/invoiceEngine");

    await invoiceEngine.updateInvoice("invoice-1", { notes: "Thanks!" });

    const passedUpdate = mockInvoiceFindByIdAndUpdate.mock.calls[0][1];
    expect(passedUpdate).toEqual({ notes: "Thanks!" });
    expect(passedUpdate).not.toHaveProperty("subtotalCents");
    expect(passedUpdate).not.toHaveProperty("totalCents");
  });

  it("serializeInvoiceForClient maps stored cents back to the original dollar API shape", async () => {
    const { serializeInvoiceForClient } = await import("@/lib/invoiceEngine");

    const storedInvoice = {
      toObject: () => ({
        _id: "inv-1",
        subtotalCents: 2549,
        taxCents: 100,
        discountCents: 50,
        totalCents: 2599,
        lineItems: [
          { description: "item", quantity: 1, unitPriceCents: 1999, totalCents: 1999 },
        ],
      }),
      subtotalCents: 2549,
      taxCents: 100,
      discountCents: 50,
      totalCents: 2599,
      lineItems: [
        { description: "item", quantity: 1, unitPriceCents: 1999, totalCents: 1999 },
      ],
    };

    const result = serializeInvoiceForClient(
      storedInvoice as unknown as Parameters<typeof serializeInvoiceForClient>[0],
    );

    expect(result.subtotal).toBe(25.49);
    expect(result.tax).toBe(1);
    expect(result.discount).toBe(0.5);
    expect(result.total).toBe(25.99);
    expect(result.lineItems[0].unitPrice).toBe(19.99);
    expect(result.lineItems[0].total).toBe(19.99);
    // Internal storage field names must not leak into the API response.
    expect(result.subtotalCents).toBeUndefined();
    expect(result.totalCents).toBeUndefined();
  });
});
