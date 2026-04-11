import type { Metadata, Viewport } from "next";
import { Montserrat, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Providers } from "@/components/Providers";
import EnvironmentBadge from "@/components/EnvironmentBadge";
import Footer from "@/components/Footer";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Rivyls",
  description: "Rivyls — fantasy college sports, brackets, pick'em, and survivor. Free to play.",
  openGraph: {
    title: "Rivyls — Draft Programs. Not Players.",
    description: "Draft programs. Not players. Fantasy college sports — free to play.",
    siteName: "Rivyls",
    url: "https://rivyls.com",
    type: "website",
    images: [
      {
        url: "https://rivyls.com/api/og/default",
        width: 1200,
        height: 630,
        alt: "Rivyls — Draft Programs. Not Players.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rivyls — Draft Programs. Not Players.",
    description: "Draft programs. Not players. Fantasy college sports — free to play.",
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
        className={`${montserrat.variable} ${inter.variable} antialiased flex flex-col min-h-screen`}
      >
        <Providers>
          <div className="flex-1 flex flex-col min-w-0">
            {children}
            <Footer />
          </div>
          <ChatSidebar />
          <EnvironmentBadge />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
