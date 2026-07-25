import type { Metadata } from "next";
import { Syne, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import WhatsAppFab from "@/components/WhatsAppFab";
import WhatsAppCommunityModal from "@/components/WhatsAppCommunityModal";

const fontHeading = Syne({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
});

const fontBody = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

const fontMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "The Local Baba — Direct from importers. Delivered to your door.",
  description:
    "Pakistan's first direct-importer B2B wholesale platform. MOQ of just 30 pcs. 48-hour dispatch. Join 500+ verified sellers.",
  icons: {
    icon: [
      { url: "/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/icon-96x96.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "The Local Baba — Wholesale, the way it should be.",
    description:
      "Direct from importers. MOQ of just 30 pcs. 48-hour dispatch. Join 500+ verified sellers.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontHeading.variable} ${fontBody.variable} ${fontMono.variable} h-full`}
    >
      <head>
        <link rel="icon" href="/icon-48x48.png" sizes="48x48" type="image/png" />
        <link rel="icon" href="/icon-96x96.png" sizes="96x96" type="image/png" />
        <link rel="icon" href="/icon-192x192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icon-512x512.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>
          {children}
          <WhatsAppCommunityModal />
        </Providers>
        <WhatsAppFab />
      </body>
    </html>
  );
}
