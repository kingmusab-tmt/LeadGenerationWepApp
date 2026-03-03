import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/authprovider";
import { NavigationProvider } from "../context/handlenavigation";
import NotificationManager from "@/app/components/NotificationManager";
import CookieConsentManager from "@/app/components/generalComponent/CookieConsentManager";
import MuiThemeProvider from "@/lib/theme/MuiThemeProvider";
import { Providers } from "@/app/reduxprovider";
import { CSRFProvider } from "@/app/hooks/useCSRF";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default:
      "BRIXCOT - #1 AI-Powered Lead Management Platform | Lead Generation Software",
    template: "%s | BRIXCOT Lead Management",
  },
  description:
    "Transform your lead business with BRIXCOT - the enterprise lead management platform featuring AI lead scoring, advanced call tracking, email & SMS marketing, lead marketplace, and 6,000+ Zapier integrations. Capture, distribute, and convert leads faster.",
  keywords: [
    "lead management software",
    "lead generation platform",
    "AI lead scoring",
    "lead distribution system",
    "call tracking software",
    "lead marketplace",
    "lead capture forms",
    "email marketing automation",
    "SMS marketing platform",
    "lead buyer management",
    "Zapier lead integration",
    "CRM lead management",
    "real estate lead management",
    "insurance lead software",
    "solar lead management",
    "mortgage lead platform",
    "home services lead generation",
    "B2B lead management",
    "lead routing software",
    "lead scoring system",
    "Twilio call tracking",
    "round-robin lead distribution",
    "lead monetization platform",
    "enterprise lead management",
    "SaaS lead management",
  ],
  authors: [{ name: "BRIXCOT", url: "https://brixcot.com" }],
  creator: "BRIXCOT",
  publisher: "BRIXCOT",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://brixcot.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "BRIXCOT",
    title: "BRIXCOT - #1 AI-Powered Lead Management Platform",
    description:
      "Enterprise lead management with AI scoring, call tracking, marketing automation, and lead marketplace. Transform how you capture, distribute, and convert leads.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BRIXCOT Lead Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BRIXCOT - AI-Powered Lead Management Platform",
    description:
      "Enterprise lead management with AI scoring, call tracking, marketing automation, and lead marketplace.",
    images: ["/twitter-image.png"],
    creator: "@brixcot",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1976d2" },
    { media: "(prefers-color-scheme: dark)", color: "#1565c0" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BRIXCOT",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered lead management platform with lead scoring, call tracking, email & SMS marketing, and lead marketplace.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "14-day free trial",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "2847",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "AI Lead Scoring",
      "Call Tracking",
      "Email Marketing",
      "SMS Marketing",
      "Lead Marketplace",
      "Zapier Integration",
      "Form Builder",
      "Analytics Dashboard",
    ],
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BRIXCOT",
    url: "https://brixcot.com",
    logo: "https://brixcot.com/logo.png",
    sameAs: [
      "https://twitter.com/brixcot",
      "https://linkedin.com/company/brixcot",
      "https://facebook.com/brixcot",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+1-800-BRIXCOT",
      contactType: "customer service",
      availableLanguage: ["English"],
    },
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <MuiThemeProvider>
          <AuthProvider>
            <NavigationProvider>
              <Providers>
                <CSRFProvider>
                  {children}
                  <CookieConsentManager />
                  <NotificationManager />
                </CSRFProvider>
              </Providers>
            </NavigationProvider>
          </AuthProvider>
        </MuiThemeProvider>
      </body>
    </html>
  );
}
