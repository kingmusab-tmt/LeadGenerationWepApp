import { Invoice, IInvoice, IInvoiceLineItem } from "@/models/invoice";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { Types } from "mongoose";

class InvoiceNumberGenerator {
  static async generateNumber(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");

    // Get count of invoices for this user this month
    const count = await Invoice.countDocuments({
      userId,
      invoiceDate: {
        $gte: new Date(year, new Date().getMonth(), 1),
        $lt: new Date(year, new Date().getMonth() + 1, 1),
      },
    });

    return `INV-${year}${month}-${String(count + 1).padStart(5, "0")}`;
  }
}

class InvoicePDFGenerator {
  static generatePDF(invoice: IInvoice): Promise<Buffer> {
    return new Promise((resolve) => {
      // Generate plain text invoice - can be converted to PDF client-side or with external service
      const invoiceText = `
INVOICE

Invoice Number: ${invoice.invoiceNumber}
Date: ${invoice.invoiceDate.toLocaleDateString()}
Due Date: ${invoice.dueDate.toLocaleDateString()}
Status: ${invoice.status.toUpperCase()}

BILL TO:
${invoice.buyerName || "Customer"}
${invoice.buyerEmail || ""}

LINE ITEMS:
${invoice.lineItems
  .map(
    (item) =>
      `${item.description} x${item.quantity} @ $${item.unitPrice.toFixed(
        2,
      )} = $${item.total.toFixed(2)}`,
  )
  .join("\n")}

SUMMARY:
Subtotal: $${invoice.subtotal.toFixed(2)}
${invoice.discount ? `Discount: -$${invoice.discount.toFixed(2)}` : ""}
${
  invoice.tax > 0 ? `Tax (${invoice.taxRate}%): $${invoice.tax.toFixed(2)}` : ""
}
Total: $${invoice.total.toFixed(2)}

${invoice.notes ? `Notes:\n${invoice.notes}` : ""}
      `.trim();

      resolve(Buffer.from(invoiceText, "utf-8"));
    });
  }
}

class InvoiceEmailService {
  static async sendInvoice(invoice: IInvoice) {
    // Implementation for email sending
    // Would integrate with email service (SendGrid, Nodemailer, etc.)
    console.log(
      `Sending invoice ${invoice.invoiceNumber} to ${invoice.buyerEmail}`,
    );

    await Invoice.findByIdAndUpdate(invoice._id, {
      status: "sent",
      updatedAt: new Date(),
    });

    return { success: true, message: "Invoice sent successfully" };
  }

  static async sendReminder(invoice: IInvoice) {
    if (invoice.status === "paid") return;
    if (!invoice.buyerEmail) return;

    console.log(
      `Sending payment reminder for invoice ${invoice.invoiceNumber}`,
    );

    await Invoice.findByIdAndUpdate(invoice._id, {
      remindersSent: invoice.remindersSent + 1,
      lastReminderDate: new Date(),
    });

    return { success: true, message: "Reminder sent" };
  }
}

class InvoiceEngine {
  async createInvoice(
    userId: string,
    payload: {
      buyerId?: string;
      buyerEmail?: string;
      buyerName?: string;
      lineItems: IInvoiceLineItem[];
      dueDate: Date;
      taxRate?: number;
      discountPercent?: number;
      discount?: number;
      notes?: string;
      termsConditions?: string;
      currency?: string;
      paymentMethod?: string;
    },
  ) {
    await dbConnect();

    const invoiceNumber = await InvoiceNumberGenerator.generateNumber(userId);

    // Calculate totals
    const subtotal = payload.lineItems.reduce(
      (sum, item) => sum + item.total,
      0,
    );
    const discountAmount = payload.discount
      ? payload.discount
      : Math.round(subtotal * ((payload.discountPercent || 0) / 100) * 100) /
        100;
    const discountedSubtotal = subtotal - discountAmount;
    const tax =
      Math.round(discountedSubtotal * ((payload.taxRate || 0) / 100) * 100) /
      100;
    const total = discountedSubtotal + tax;

    const invoice = await Invoice.create({
      userId,
      buyerId: payload.buyerId,
      buyerEmail: payload.buyerEmail,
      buyerName: payload.buyerName,
      invoiceNumber,
      invoiceDate: new Date(),
      dueDate: payload.dueDate,
      lineItems: payload.lineItems,
      subtotal,
      tax,
      taxRate: payload.taxRate,
      discount: discountAmount,
      discountPercent: payload.discountPercent,
      total,
      notes: payload.notes,
      termsConditions: payload.termsConditions,
      currency: payload.currency || "USD",
      paymentMethod: payload.paymentMethod,
      status: "draft",
      isPaid: false,
    });

    return invoice;
  }

  async updateInvoice(invoiceId: string, updates: Partial<IInvoice>) {
    await dbConnect();

    // Recalculate totals if line items changed
    let updateData = { ...updates };
    if (updates.lineItems) {
      const subtotal = updates.lineItems.reduce(
        (sum, item) => sum + item.total,
        0,
      );
      const discountAmount = updates.discount
        ? updates.discount
        : Math.round(subtotal * ((updates.discountPercent || 0) / 100) * 100) /
          100;
      const discountedSubtotal = subtotal - discountAmount;
      const tax =
        Math.round(discountedSubtotal * ((updates.taxRate || 0) / 100) * 100) /
        100;
      const total = discountedSubtotal + tax;

      updateData = {
        ...updateData,
        subtotal,
        tax,
        discount: discountAmount,
        total,
      };
    }

    const invoice = await Invoice.findByIdAndUpdate(invoiceId, updateData, {
      new: true,
    });

    return invoice;
  }

  async sendInvoice(invoiceId: string) {
    await dbConnect();

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Generate PDF
    const pdf = await InvoicePDFGenerator.generatePDF(invoice);
    void pdf;

    // Send email
    await InvoiceEmailService.sendInvoice(invoice);

    return {
      success: true,
      message: "Invoice sent",
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  async markAsPaid(
    invoiceId: string,
    paymentMethod: string,
    paymentDate?: Date,
  ) {
    await dbConnect();

    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        status: "paid",
        isPaid: true,
        paymentMethod,
        paymentDate: paymentDate || new Date(),
      },
      { new: true },
    );

    return invoice;
  }

  async generatePDF(invoiceId: string): Promise<Buffer> {
    await dbConnect();

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    return InvoicePDFGenerator.generatePDF(invoice);
  }

  async getInvoiceStats(userId: string) {
    await dbConnect();

    const stats = await Invoice.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
    ]);

    const invoiceStats: Record<string, { count: number; total: number }> = {};
    stats.forEach(
      (stat: { _id: string; count: number; totalAmount: number }) => {
        invoiceStats[stat._id] = {
          count: stat.count,
          total: stat.totalAmount,
        };
      },
    );

    // Get total revenue from paid invoices
    const paidTotal = invoiceStats.paid?.total || 0;
    const overduTotal = invoiceStats.overdue?.total || 0;

    return {
      totalInvoices: await Invoice.countDocuments({ userId }),
      paidInvoices: invoiceStats.paid?.count || 0,
      draftInvoices: invoiceStats.draft?.count || 0,
      sentInvoices: invoiceStats.sent?.count || 0,
      overdueInvoices: invoiceStats.overdue?.count || 0,
      totalRevenue: paidTotal,
      pendingRevenue: overduTotal,
      stats: invoiceStats,
    };
  }

  async getOverdueInvoices(userId: string) {
    await dbConnect();

    const now = new Date();
    const overdueInvoices = await Invoice.find({
      userId,
      dueDate: { $lt: now },
      status: { $ne: "paid" },
    }).sort({ dueDate: -1 });

    return overdueInvoices;
  }

  async createRecurringInvoice(
    userId: string,
    templateInvoiceId: string,
    frequency: "monthly" | "quarterly" | "annually",
    endDate?: Date,
  ) {
    await dbConnect();

    const template = await Invoice.findById(templateInvoiceId);
    if (!template) throw new Error("Template invoice not found");

    // Create first recurring invoice
    const newInvoice = await this.createInvoice(userId, {
      buyerId: template.buyerId?.toString(),
      buyerEmail: template.buyerEmail,
      buyerName: template.buyerName,
      lineItems: template.lineItems,
      dueDate: this.calculateNextDueDate(new Date(), frequency),
      taxRate: template.taxRate,
      discount: template.discount,
      notes: template.notes,
      currency: template.currency,
      paymentMethod: template.paymentMethod,
    });

    // Mark as recurring
    await Invoice.findByIdAndUpdate(newInvoice._id, {
      recurringEnabled: true,
      recurringFrequency: frequency,
      parentInvoiceId: templateInvoiceId,
      recurringEndDate: endDate,
      nextRecurringDate: this.calculateNextDueDate(
        new Date(newInvoice.dueDate),
        frequency,
      ),
    });

    return newInvoice;
  }

  private calculateNextDueDate(
    date: Date,
    frequency: "monthly" | "quarterly" | "annually",
  ): Date {
    const nextDate = new Date(date);
    switch (frequency) {
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "annually":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    return nextDate;
  }

  async deleteInvoice(invoiceId: string) {
    await dbConnect();

    await Invoice.findByIdAndDelete(invoiceId);
    return { success: true, message: "Invoice deleted" };
  }
}

export const invoiceEngine = new InvoiceEngine();
