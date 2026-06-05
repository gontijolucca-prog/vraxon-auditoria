import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VRAXON – Auditoria Grátis do seu perfil no Google Maps",
  description:
    "Descubra como a sua empresa aparece no Google Maps. Auditoria gratuita por IA com pontuação, pontos críticos e radar da concorrência.",
  icons: { icon: "/vraxon-logo.png" },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-PT"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {GA_ID && (
          <>
            <script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} async />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`,
              }}
            />
          </>
        )}
        {children}
      </body>
    </html>
  );
}