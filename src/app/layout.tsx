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
        {/* Refresh starts at the top (family-standard): on reload only, clamp
            scroll to the top until the load settles — the browser's restore
            can't be cancelled mid-flight, so it gets clamped instead.
            Back/forward and #anchor behavior stay native; any real user
            input disarms the clamp. Same script as OpenMirrorTheme.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var n=performance.getEntriesByType("navigation")[0];if(!n||n.type!=="reload"||location.hash)return;var armed=true,poll;var disarm=function(){armed=false;clearInterval(poll);removeEventListener("scroll",clamp,true);};var clamp=function(){if(armed&&(window.scrollY||window.scrollX))window.scrollTo(0,0);};addEventListener("scroll",clamp,true);["wheel","touchstart","keydown","pointerdown"].forEach(function(t){addEventListener(t,disarm,{once:true,capture:true,passive:true});});window.scrollTo(0,0);poll=setInterval(clamp,100);addEventListener("load",function(){setTimeout(function(){clamp();disarm();},250);},{once:true});setTimeout(disarm,8000);}catch(e){}})();',
          }}
        />
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
