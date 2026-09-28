import type { Metadata, Viewport } from "next";
import { Inter, Special_Elite } from "next/font/google";
import "./globals.css";

const display = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const ui = Inter({ subsets: ["latin"], variable: "--font-ui" });

export const metadata: Metadata = {
  title: "The Cabin",
  description: "An oracle trained on the Unabomber's writing and the record of whom he targeted. Ten questions. One verdict.",
};

export const viewport: Viewport = {
  themeColor: "#050607",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}
