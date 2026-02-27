import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Providers } from "@/components/Providers";
import EnvironmentBadge from "@/components/EnvironmentBadge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rivyls",
  description: "Fantasy sports platform for college football, hockey, and more",
  openGraph: {
    title: "Rivyls — Fantasy College Football",
    description: "Draft teams. Compete with friends. Win prizes.",
    siteName: "Rivyls",
    url: "https://rivyls.com",
    type: "website",
    images: [
      {
        url: "https://rivyls.com/api/og/default",
        width: 1200,
        height: 630,
        alt: "Rivyls — Fantasy College Football",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rivyls — Fantasy College Football",
    description: "Draft teams. Compete with friends. Win prizes.",
    images: ["https://rivyls.com/api/og/default"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${inter.variable} antialiased`}
      >
        <Providers>
          {children}
          <EnvironmentBadge />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
