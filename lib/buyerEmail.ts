import nodemailer from "nodemailer";

type BuyerEmailVariant = "welcome" | "credit";

type BuyerEmailParams = {
  variant: BuyerEmailVariant;
  buyerEmail: string;
  buyerName: string;
  buyerCompany: string;
  buyerPhone: string;
  sellerName: string;
  sellerCompany: string;
  signInUrl: string;
  creditedUnits?: number;
  currentBalance?: number;
};

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST || process.env.EMAIL_SERVER!,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_SERVER_USER || process.env.EMAIL_FROM!,
      pass: process.env.EMAIL_SERVER_PASSWORD || process.env.EMAIL_PASSWORD!,
    },
  });
}

function buildBuyerEmailHtml(params: BuyerEmailParams) {
  const {
    variant,
    buyerName,
    buyerEmail,
    buyerCompany,
    buyerPhone,
    sellerName,
    sellerCompany,
    signInUrl,
    creditedUnits = 0,
    currentBalance = 0,
  } = params;

  const title =
    variant === "welcome"
      ? "Welcome to BRIXCOT"
      : "Your BRIXCOT Wallet Has Been Credited";
  const subtitle =
    variant === "welcome"
      ? "Your Lead Buyer Account is Ready"
      : "Your Lead Buyer Credits Are Available";
  const intro =
    variant === "welcome"
      ? `<p>Great news! <strong>${sellerName}</strong> from <strong>${sellerCompany}</strong> has registered you as a lead buyer on BRIXCOT, our lead management platform.</p>`
      : `<p>Great news! <strong>${sellerName}</strong> from <strong>${sellerCompany}</strong> has manually credited your lead buyer account on BRIXCOT.</p>`;
  const detailsRows =
    variant === "welcome"
      ? `
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${buyerName}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${buyerCompany}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${buyerEmail}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Phone:</strong></td><td style="padding: 8px 0;">${buyerPhone}</td></tr>
      `
      : `
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${buyerName}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${buyerCompany}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${buyerEmail}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${buyerPhone}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Credits Added:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${creditedUnits}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Current Balance:</strong></td><td style="padding: 8px 0;">${currentBalance}</td></tr>
      `;

  const steps =
    variant === "welcome"
      ? `
        <ol style="padding-left: 20px;">
          <li style="margin-bottom: 10px;"><strong>Click the Sign In button below</strong> to go to the login page</li>
          <li style="margin-bottom: 10px;"><strong>Sign in with Google</strong> using this email address (${buyerEmail})</li>
          <li style="margin-bottom: 10px;"><strong>Select "Buyer"</strong> on the role selection page</li>
          <li style="margin-bottom: 10px;"><strong>Access your dashboard</strong> and start purchasing leads!</li>
        </ol>
      `
      : `
        <ol style="padding-left: 20px;">
          <li style="margin-bottom: 10px;"><strong>Click the Sign In button below</strong> to go to your dashboard</li>
          <li style="margin-bottom: 10px;"><strong>Sign in with Google</strong> using this email address (${buyerEmail})</li>
          <li style="margin-bottom: 10px;"><strong>Select "Buyer"</strong> on the role selection page</li>
          <li style="margin-bottom: 10px;"><strong>Review your updated credit balance</strong> and continue purchasing leads!</li>
        </ol>
      `;

  const footerNote =
    variant === "welcome"
      ? "If you have any questions, please contact your seller directly or reach out to our support team."
      : "If you have any questions about this credit update, please contact your seller directly or reach out to our support team.";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1976d2, #1565c0); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">${title}! 🎉</h1>
    <p style="color: #e3f2fd; margin-top: 10px;">${subtitle}</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e0e0e0;">
    <p>Hello <strong>${buyerName}</strong>,</p>
    ${intro}
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
      <h3 style="margin-top: 0; color: #1976d2;">📋 Your Registration Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${detailsRows}
      </table>
      <p style="font-size: 12px; color: #666; margin-top: 10px; margin-bottom: 0;">💡 You can update this information anytime from your dashboard.</p>
    </div>
    
    <h3 style="color: #1976d2;">🚀 How to Access Your Buyer Dashboard:</h3>
    ${steps}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${signInUrl}" style="display: inline-block; background: #1976d2; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Sign In to Your Dashboard</a>
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffc107; margin-top: 20px;">
      <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> Make sure to select <strong>"Buyer"</strong> during role selection to access the buyer dashboard and lead marketplace.</p>
    </div>
    
    <h3 style="color: #1976d2; margin-top: 25px;">👤 Your Seller Contact:</h3>
    <p style="margin: 5px 0;"><strong>Name:</strong> ${sellerName}</p>
    <p style="margin: 5px 0;"><strong>Company:</strong> ${sellerCompany}</p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
    
    <p style="color: #666; font-size: 14px;">${footerNote}</p>
  </div>
  
  <div style="background: #1565c0; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
    <p style="color: white; margin: 0; font-size: 14px;">© ${new Date().getFullYear()} BRIXCOT - Lead Management Platform</p>
  </div>
</body>
</html>
  `;
}

export async function sendBuyerEmail(params: BuyerEmailParams) {
  const transporter = createTransporter();
  const html = buildBuyerEmailHtml(params);

  await transporter.sendMail({
    from: `${process.env.EMAIL_FROM_NAME || "Brixcot Support"} <${process.env.EMAIL_FROM}>`,
    to: params.buyerEmail,
    subject:
      params.variant === "welcome"
        ? `Welcome to BRIXCOT - ${params.sellerCompany} has registered you as a Lead Buyer`
        : `Your BRIXCOT account has been credited with ${params.creditedUnits || 0} credits`,
    html,
    text:
      params.variant === "welcome"
        ? `Welcome to BRIXCOT!\n\nHello ${params.buyerName},\n\n${params.sellerName} from ${params.sellerCompany} has registered you as a lead buyer. Visit ${params.signInUrl} to sign in with Google, select "Buyer" role, and access your dashboard.\n\nYour Registration Details:\nName: ${params.buyerName}\nCompany: ${params.buyerCompany}\nEmail: ${params.buyerEmail}\nPhone: ${params.buyerPhone}\n\nYou can update this information from your dashboard.`
        : `Hello ${params.buyerName},\n\nYour lead buyer account has been credited with ${params.creditedUnits || 0} credits by ${params.sellerName} from ${params.sellerCompany}. Your current balance is ${params.currentBalance || 0}. Visit ${params.signInUrl} to review your updated dashboard.\n\nYour Registration Details:\nName: ${params.buyerName}\nCompany: ${params.buyerCompany}\nEmail: ${params.buyerEmail}\nPhone: ${params.buyerPhone}\nCredits Added: ${params.creditedUnits || 0}\nCurrent Balance: ${params.currentBalance || 0}`,
  });
}
