// GET /api/email/unsubscribe/[token] - Handle unsubscribe
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { EmailAnalyticsEngine } from "@/lib/emailMarketingEngine";

export const dynamic = "force-dynamic";

/**
 * GET /api/email/unsubscribe/[token]
 * Handle unsubscribe and show confirmation page
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await dbConnect();

    // Record unsubscribe
    const analyticsEngine = new EmailAnalyticsEngine();
    await analyticsEngine.recordUnsubscribe(token);

    // Return HTML confirmation page
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Unsubscribe Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { 
                max-width: 600px; 
                margin: 50px auto; 
                background: white; 
                padding: 40px; 
                border-radius: 8px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success {
                color: #4CAF50;
                text-align: center;
            }
            .message {
                color: #666;
                margin-top: 20px;
                line-height: 1.6;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="success">✓ Successfully Unsubscribed</h1>
            <p class="message">
                You have been successfully unsubscribed from our mailing list.
                <br><br>
                You will no longer receive marketing emails from us.
                If you have any questions, please contact our support team.
            </p>
        </div>
    </body>
    </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error processing unsubscribe:", error);

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Error</title>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { 
                max-width: 600px; 
                margin: 50px auto; 
                background: white; 
                padding: 40px; 
                border-radius: 8px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .error {
                color: #f44336;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="error">✗ Error Processing Request</h1>
            <p>We encountered an error processing your request. Please try again later.</p>
        </div>
    </body>
    </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
}
