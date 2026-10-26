import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reel",
  description: "Rate films and TV series out of 5, to one decimal place.",
};

export const viewport: Viewport = {
  themeColor: "#14181c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-[#e6edf3] font-sans">{children}</body>
    </html>
  );
}
