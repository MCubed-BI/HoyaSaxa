import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND_MARK_SRC, PRODUCT_DESCRIPTION, PRODUCT_DISPLAY_NAME } from "@/lib/product";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: PRODUCT_DISPLAY_NAME,
  title: {
    default: PRODUCT_DISPLAY_NAME,
    template: `%s · ${PRODUCT_DISPLAY_NAME}`,
  },
  description: PRODUCT_DESCRIPTION,
  appleWebApp: {
    title: PRODUCT_DISPLAY_NAME,
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
      { url: BRAND_MARK_SRC, type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#041e42",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
