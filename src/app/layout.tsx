import type { Metadata } from "next";
import { Archivo, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Google Analytics 4 measurement ID for the michaeljportfolio.me web stream.
// Public by design: it only identifies which GA4 stream the browser reports to.
const GA_MEASUREMENT_ID = "G-4H86T3MD8N";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://michaeljportfolio.me"),
  title: "Michael Johnson · Business Analytics & Full-Stack",
  description:
    "Information Systems & Business Analytics student at LMU: mortgage file analysis, operations data, a first-place datathon, and full-stack builds.",
  openGraph: {
    title: "Michael Johnson · Business Analytics & Full-Stack",
    description: "Business analyst and full-stack builder. Résumé, projects, and results.",
    url: "https://michaeljportfolio.me",
    type: "profile",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${hanken.variable}`}>
      <head>
        {/* Google tag (gtag.js) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', '${GA_MEASUREMENT_ID}');`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
