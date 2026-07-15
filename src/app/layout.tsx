import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OpenMirrorNav from "../components/OpenMirrorNav";
import ChpProductNav from "../components/ChpProductNav";
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
        {/* Theme boots before first paint: read ?color / saved choice and set
            both theme attributes synchronously, so a light-mode visitor never
            sees a dark flash and the ☀️/🌙 switch feels instant on every page.
            (The scroll-to-top reload clamp now ships inside OpenMirrorNav's
            theme toggle, same as every other family site.) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var p=new URLSearchParams(location.search);var u=p.get("color")||p.get("theme");var t;if(u){t=/^(light|bright|fresh|medium|warm)$/.test(u)?"light":"dark";}else{t=(localStorage.getItem("crossheartpray-visual-theme")==="light"||localStorage.getItem("om-theme")==="light")?"light":"dark";}var d=document.documentElement;d.dataset.chpVisualTheme=t;d.dataset.omTheme=t;}catch(e){}})();',
          }}
        />
        <VisualThemeProvider>
          <OpenMirrorNav site="CrossHeartPray.com" />
          <ChpProductNav />
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
