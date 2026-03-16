import type { Metadata } from "next";
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
        className={`${montserrat.variable} ${inter.variable} antialiased flex flex-col min-h-screen`}
      >
        <Providers>
          <div className="flex-1 flex">
            <div className="flex-1 flex flex-col min-w-0">
              {children}
            </div>
            <ChatSidebar />
          </div>
          <Footer />
          <EnvironmentBadge />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
