"use client";
import type { Metadata } from "next";
import Head from "next/head";
import { Inter } from "next/font/google";
import { EmailProvider } from "@/context/UserContext";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <title>FeedRecap - AI Powered X Newsletters</title>
        <meta
          name="description"
          content="FeedRecap curates top X posts with AI, delivering personalized newsletters curated from your preferred X accounts. Stay informed without endless scrolling 🚀"
        />
        <meta
          name="keywords"
          content="FeedRecap, AI-powered X app, X curator, personalized newsletters, Politics news, Financial Markets updates, Sports highlights, Tech trends, curated tweets, X insights, social media curation, AI news delivery, X newsletter app, daily news updates, trending tweets, AI-powered curation, business news, tech enthusiasts, political updates, sports fans, financial analytics, tweet analysis, newsletter for X, trending hashtags, AI tweet aggregator, social media trends, curated content, daily tech trends, top tweets newsletter, curated social feeds, professional curation tools, news dashboard, curated news experience, news app for X, AI newsletters, trending social updates, effortless news delivery, social news analysis, FeedRecap newsletter, latest tweet roundup, breaking news from X, personalized tweet curation, trending finance news, customized news curation, tweet tracking tools, AI-driven social insights"
        />
        <meta name="author" content="FeedRecap" />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          property="og:title"
          content="FeedRecap - Your Timeline Summarized"
        />
        <meta
          property="og:description"
          content="FeedRecap curates top tweets from X into personalized newsletters on topics like Politics, Tech, Sports, Finance, and more. Effortless, tailored, and AI-driven."
        />
        <meta property="og:url" content="https://www.feedrecap.com" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.feedrecap.com/favicon.ico"
        />

        <link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <meta name="apple-mobile-web-app-title" content="FeedRecap" />
        <link rel="manifest" href="%/site.webmanifest" />
      </head>
      <body className={(inter.className, montserrat.className)}>
        <EmailProvider>{children}</EmailProvider>
        <Analytics />
        <SpeedInsights />
      </body>
      <GoogleAnalytics gaId={`${process.env.NEXT_PUBLIC_GOOGLE_ANALYTIC}`} />
    </html>
  );
}
