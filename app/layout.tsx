import type { Metadata } from "next";
import { Cairo, IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import MetaPixel from "./components/MetaPixel";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "أكسيوم ماركتس | تداول الأسهم والعملات والعملات الرقمية",
  description: "تداول الأسهم والعملات والعملات الرقمية من منصة واحدة دقيقة.",
};

// Applies the saved theme before first paint so there is no flash.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme="dark"
      suppressHydrationWarning
      className={`${plexArabic.variable} ${cairo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <MetaPixel />
      </body>
    </html>
  );
}
