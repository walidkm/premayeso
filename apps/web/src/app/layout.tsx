import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://premayeso.com"),
  title: {
    default: "PreMayeso | Malawi MANEB exam preparation",
    template: "%s | PreMayeso",
  },
  description:
    "Mobile-first MANEB exam preparation for Malawi learners. JCE is live now, with MSCE and PSLCE waitlist-ready.",
  alternates: {
    canonical: "https://premayeso.com",
  },
  openGraph: {
    title: "PreMayeso | Malawi MANEB exam preparation",
    description:
      "Lessons, past papers, explanations, and revision guidance for Malawi learners. JCE is live now.",
    url: "https://premayeso.com",
    siteName: "PreMayeso",
    locale: "en_MW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PreMayeso | Malawi MANEB exam preparation",
    description:
      "JCE is live first. Build stronger exam confidence with low-bandwidth-friendly learning and revision support.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
