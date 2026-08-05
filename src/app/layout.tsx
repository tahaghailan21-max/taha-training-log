import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import OutboxSync from "@/components/OutboxSync";
import PageTransition from "@/components/PageTransition";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Training Log",
  description: "Taha's personal training log",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TrainLog",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Prevent theme flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})()` }} />
        {/* Prevent RTL/lang flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var l=localStorage.getItem('lang');if(l){document.documentElement.setAttribute('lang',l);if(l==='ar')document.documentElement.setAttribute('dir','rtl');}}catch(e){}})()` }} />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
        <OutboxSync />
        <Suspense fallback={null}><PageTransition /></Suspense>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW registration failed:',e);});});}` }} />
      </body>
    </html>
  );
}
