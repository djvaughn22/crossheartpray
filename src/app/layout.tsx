import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OpenMirrorTopBar from "../components/OpenMirrorTopBar";
import VisualThemeProvider from "../components/VisualThemeProvider";
import Script from "next/script";

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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2PXSNXTPX0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2PXSNXTPX0');`}
        </Script>
      </body>
    </html>
  );
}
