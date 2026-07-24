import { Invoice, IInvoice, IInvoiceLineItem } from "@/models/invoice";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { Types } from "mongoose";
import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
import { addMoney, applyPercentage, subtractMoney, sumMoney } from "@/lib/money";

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

// Was previously a plain-text buffer served with a Content-Type: application/pdf
// header and a .pdf filename — it opened as corrupted/garbage in any real PDF
// viewer (Adobe Reader, browser PDF viewers, most email clients). This builds
// an actual PDF document with pdf-lib (pure JS, no native/system dependencies,
// so it works the same in a serverless deployment as locally).
class InvoicePDFGenerator {
  private static readonly PAGE_WIDTH = 612; // US Letter, points
  private static readonly PAGE_HEIGHT = 792;
  private static readonly MARGIN = 50;

  private static formatMoney(amount: number, currency: string): string {
    return `${currency ? currency.toUpperCase() + " " : ""}$${amount.toFixed(2)}`;
  }

  // pdf-lib doesn't auto-wrap text — break long lines to fit maxWidth
  // ourselves using the font's own character-width metrics.
  private static wrapText(
    text: string,
    font: PDFFont,
    size: number,
    maxWidth: number,
  ): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [""];
  }

  static async generatePDF(invoice: IInvoice): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([this.PAGE_WIDTH, this.PAGE_HEIGHT]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    const contentWidth = this.PAGE_WIDTH - this.MARGIN * 2;
    let y = this.PAGE_HEIGHT - this.MARGIN;

    const drawLine = (
      text: string,
      options: {
        size?: number;
        bold?: boolean;
        x?: number;
        color?: ReturnType<typeof rgb>;
        gap?: number;
      } = {},
    ) => {
      const { size = 10, bold = false, x = this.MARGIN, gap = 16 } = options;
      page.drawText(text, {
        x,
        y,
        size,
        font: bold ? boldFont : font,
        color: options.color ?? rgb(0.11, 0.14, 0.13),
      });
      y -= gap;
    };

    drawLine("INVOICE", { size: 22, bold: true, gap: 30 });

    drawLine(`Invoice Number: ${invoice.invoiceNumber}`, { bold: true });
    drawLine(`Date: ${invoice.invoiceDate.toLocaleDateString()}`);
    drawLine(`Due Date: ${invoice.dueDate.toLocaleDateString()}`);
    drawLine(`Status: ${invoice.status.toUpperCase()}`, { gap: 26 });

    drawLine("BILL TO", { bold: true, size: 11 });
    drawLine(invoice.buyerName || "Customer");
    if (invoice.buyerEmail) drawLine(invoice.buyerEmail);
    y -= 10;

    // Line items table
    const col = {
      description: this.MARGIN,
      qty: this.MARGIN + contentWidth * 0.55,
      unitPrice: this.MARGIN + contentWidth * 0.7,
      total: this.MARGIN + contentWidth * 0.85,
    };
    drawLine("Description", { bold: true, size: 10, x: col.description, gap: 0 });
    page.drawText("Qty", { x: col.qty, y, size: 10, font: boldFont });
    page.drawText("Unit Price", { x: col.unitPrice, y, size: 10, font: boldFont });
    page.drawText("Total", { x: col.total, y, size: 10, font: boldFont });
    y -= 6;
    page.drawLine({
      start: { x: this.MARGIN, y },
      end: { x: this.MARGIN + contentWidth, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 16;

    const descriptionMaxWidth = col.qty - col.description - 10;
    for (const item of invoice.lineItems) {
      const descLines = this.wrapText(
        item.description,
        font,
        9.5,
        descriptionMaxWidth,
      );
      const rowTop = y;
      descLines.forEach((line, i) => {
        page.drawText(line, {
          x: col.description,
          y: rowTop - i * 12,
          size: 9.5,
          font,
        });
      });
      page.drawText(String(item.quantity), { x: col.qty, y: rowTop, size: 9.5, font });
      page.drawText(this.formatMoney(item.unitPrice, invoice.currency), {
        x: col.unitPrice,
        y: rowTop,
        size: 9.5,
        font,
      });
      page.drawText(this.formatMoney(item.total, invoice.currency), {
        x: col.total,
        y: rowTop,
        size: 9.5,
        font,
      });
      y = rowTop - Math.max(descLines.length * 12, 16) - 4;

      // A very large invoice could overflow the page — bail out gracefully
      // rather than drawing off the bottom margin.
      if (y < this.MARGIN + 140) {
        drawLine("(additional line items truncated)", { size: 8 });
        break;
      }
    }

    y -= 10;
    page.drawLine({
      start: { x: this.MARGIN, y },
      end: { x: this.MARGIN + contentWidth, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 20;

    const drawSummaryRow = (label: string, value: string, bold = false) => {
      page.drawText(label, {
        x: col.unitPrice,
        y,
        size: 10,
        font: bold ? boldFont : font,
      });
      page.drawText(value, { x: col.total, y, size: 10, font: bold ? boldFont : font });
      y -= 16;
    };

    drawSummaryRow("Subtotal:", this.formatMoney(invoice.subtotal, invoice.currency));
    if (invoice.discount) {
      drawSummaryRow(
        "Discount:",
        `-${this.formatMoney(invoice.discount, invoice.currency)}`,
      );
    }
    if (invoice.tax > 0) {
      drawSummaryRow(
        `Tax${invoice.taxRate ? ` (${invoice.taxRate}%)` : ""}:`,
        this.formatMoney(invoice.tax, invoice.currency),
      );
    }
    drawSummaryRow("Total:", this.formatMoney(invoice.total, invoice.currency), true);

    if (invoice.notes) {
      y -= 14;
      drawLine("Notes", { bold: true, size: 10 });
      for (const line of this.wrapText(invoice.notes, font, 9.5, contentWidth)) {
        drawLine(line, { size: 9.5, gap: 13 });
      }
    }

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
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

    // console.log(
    //   `Sending payment reminder for invoice ${invoice.invoiceNumber}`,
    // );

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
      paymentMethod?: IInvoice["paymentMethod"];
    },
  ) {
    await dbConnect();

    const invoiceNumber = await InvoiceNumberGenerator.generateNumber(userId);

    // Calculate totals — cent-safe (see lib/money.ts) so summing line items
    // and applying discount/tax percentages can't accumulate float drift.
    const subtotal = sumMoney(payload.lineItems.map((item) => item.total));
    const discountAmount = payload.discount
      ? payload.discount
      : applyPercentage(subtotal, payload.discountPercent || 0);
    const discountedSubtotal = subtractMoney(subtotal, discountAmount);
    const tax = applyPercentage(discountedSubtotal, payload.taxRate || 0);
    const total = addMoney(discountedSubtotal, tax);

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

    // Recalculate totals if line items changed — cent-safe, see createInvoice.
    let updateData = { ...updates };
    if (updates.lineItems) {
      const subtotal = sumMoney(updates.lineItems.map((item) => item.total));
      const discountAmount = updates.discount
        ? updates.discount
        : applyPercentage(subtotal, updates.discountPercent || 0);
      const discountedSubtotal = subtractMoney(subtotal, discountAmount);
      const tax = applyPercentage(discountedSubtotal, updates.taxRate || 0);
      const total = addMoney(discountedSubtotal, tax);

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
    paymentMethod: NonNullable<IInvoice["paymentMethod"]>,
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
