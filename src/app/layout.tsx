import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OpenMirrorTopBar from "../components/OpenMirrorTopBar";
import VisualThemeProvider from "../components/VisualThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Cross Heart Pray", template: "%s | Cross Heart Pray" },
  description: "Bible verses, prayer, Daily Hope, Bible Bingo, and reading plans — your daily faith routine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <VisualThemeProvider>
          <OpenMirrorTopBar />
          {children}
        </VisualThemeProvider>
      </body>
    </html>
  );
}
