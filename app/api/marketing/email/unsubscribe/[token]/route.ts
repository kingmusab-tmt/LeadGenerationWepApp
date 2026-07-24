// GET /api/email/unsubscribe/[token] - Show unsubscribe confirmation page
// POST /api/email/unsubscribe/[token] - Actually process the unsubscribe
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { EmailAnalyticsEngine } from "@/lib/emailMarketingEngine";

export const dynamic = "force-dynamic";

const PAGE_STYLES = `
  body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
  .container {
      max-width: 600px;
      margin: 50px auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
  }
  .success { color: #4CAF50; }
  .error { color: #f44336; }
  .message { color: #666; margin-top: 20px; line-height: 1.6; }
  button {
      margin-top: 24px;
      padding: 12px 28px;
      font-size: 15px;
      border: none;
      border-radius: 6px;
      background: #1976d2;
      color: white;
      cursor: pointer;
  }
`;

function renderPage(title: string, bodyHtml: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <title>${title}</title>
      <style>${PAGE_STYLES}</style>
  </head>
  <body>
      <div class="container">${bodyHtml}</div>
  </body>
  </html>
  `;
}

/**
 * GET /api/email/unsubscribe/[token]
 * Shows a confirmation page instead of unsubscribing immediately — a bare
 * GET is not a reliable signal of user intent, since corporate email
 * security scanners and link-prefetchers (e.g. Outlook Safe Links) fetch
 * links in emails automatically, which would otherwise unsubscribe people
 * who never clicked anything.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const html = renderPage(
    "Confirm Unsubscribe",
    `
      <h1>Unsubscribe from our mailing list?</h1>
      <p class="message">
          Click the button below to confirm you no longer want to receive
          marketing emails from us.
      </p>
      <form method="POST" action="/api/marketing/email/unsubscribe/${encodeURIComponent(token)}">
          <button type="submit">Confirm Unsubscribe</button>
      </form>
    `,
  );
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * POST /api/email/unsubscribe/[token]
 * Handle the confirmed unsubscribe action
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    await dbConnect();

    const analyticsEngine = new EmailAnalyticsEngine();
    await analyticsEngine.recordUnsubscribe(token);

    const html = renderPage(
      "Unsubscribe Confirmation",
      `
        <h1 class="success">&#10003; Successfully Unsubscribed</h1>
        <p class="message">
            You have been successfully unsubscribed from our mailing list.
            <br><br>
            You will no longer receive marketing emails from us.
            If you have any questions, please contact our support team.
        </p>
      `,
    );
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error processing unsubscribe:", error);
    const html = renderPage(
      "Error",
      `
        <h1 class="error">&#10007; Error Processing Request</h1>
        <p class="message">We encountered an error processing your request. Please try again later.</p>
      `,
    );
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
