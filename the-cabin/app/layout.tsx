import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

const ui = Urbanist({ subsets: ["latin"], variable: "--font-ui" });

export const metadata: Metadata = {
  title: "The Ted Test",
  description: "Would Ted have killed you? Ten questions about your work, your beliefs and your technology, read against the Unabomber's writing and the record of whom he targeted.",
};

export const viewport: Viewport = {
  themeColor: "#070a0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ui.variable}>
      <body>{children}</body>
    </html>
  );
}
