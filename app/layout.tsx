import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movie Tracker",
  description: "Rate films and TV series out of 5, to one decimal place.",
  // "Add to Home Screen" on iPhone opens full-screen, like an app.
  appleWebApp: { capable: true, title: "Movies", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#14181c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the safe-area padding take over around the notch and home indicator
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-[#e6edf3] font-sans">{children}</body>
    </html>
  );
}
