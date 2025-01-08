"use client";
import type { Metadata } from "next";
import Head from "next/head";
import { Inter } from "next/font/google";
import { EmailProvider } from "@/context/UserContext";
import Script from "next/script";
import { GoogleAnalytics } from '@next/third-parties/google'
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <title>FeedRecap</title>
        <meta
          name="description"
          content="FeedRecap is an AI-powered app that curates top tweets from X formerly known as Twitter, based on your selected categories and preferred delivery times. Stay informed with personalized newsletters on topics like Politics, Financial Markets, Sports, Tech, and more, delivered directly to your inbox. Customize your news consumption effortlessly and track engagement through a user-friendly dashboard. Join FeedRecap and never miss the latest updates without the endless scrolling"
        />

        {/* Google Analytics Script */}
        {/* <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTIC}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTIC}');
          `}
        </Script> */}
      </head>
      <body className={inter.className}>
        <EmailProvider>{children}</EmailProvider>
      </body>
      <GoogleAnalytics gaId={`${process.env.NEXT_PUBLIC_GOOGLE_ANALYTIC}`} />
    </html>
  );
}
