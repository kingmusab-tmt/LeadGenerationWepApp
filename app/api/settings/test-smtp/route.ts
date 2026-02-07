import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

/**
 * POST /api/settings/test-smtp
 * Test SMTP connection using the user's configured email settings
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const settings = user.emailSettings;
    if (!settings?.smtpServer) {
      return NextResponse.json(
        {
          error:
            "SMTP server not configured. Please save your email settings first.",
        },
        { status: 400 },
      );
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpServer,
      port: settings.port || 587,
      secure: settings.port === 465,
      auth: {
        user: settings.smtpUser || process.env.EMAIL_FROM!,
        pass: settings.smtpPassword || process.env.EMAIL_PASSWORD!,
      },
    });

    await transporter.verify();

    return NextResponse.json(
      {
        success: true,
        message: "SMTP connection successful! Your email settings are working.",
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `SMTP connection failed: ${message}` },
      { status: 400 },
    );
  }
}
