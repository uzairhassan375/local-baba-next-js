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
    icon: "/browseTab image.jpeg",
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
