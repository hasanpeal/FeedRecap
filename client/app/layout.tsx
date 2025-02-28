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
          content="FeedRecap is the ultimate AI-powered platform for discovering curated top tweets and insights from X. Effortlessly stay informed with personalized newsletters covering trending topics like Politics, Financial Markets, Sports, Technology, and more. Designed for professionals, enthusiasts, and news seekers, FeedRecap transforms your X experience by delivering meaningful updates directly to your inbox at your preferred time. Explore trending tweets, track engagement with a user-friendly dashboard, and enjoy curated content without endless scrolling. Perfect for busy individuals seeking accurate, timely, and organized social media insights. Join FeedRecap today to redefine the way you consume news and social trends."
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
          content="FeedRecap: AI-Powered X Curator | Personalized Newsletters"
        />
        <meta
          property="og:description"
          content="FeedRecap curates top tweets from X into personalized newsletters on topics like Politics, Tech, Sports, Finance, and more. Effortless, tailored, and AI-driven."
        />
        <meta property="og:url" content="https://www.feedrecap.com" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.feedrecap.com/icons8-feed-50.png"
        />

        <link rel="canonical" href="https://www.feedrecap.com" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/icons8-feed-50.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/icons8-feed-50.png"
        />
        <link rel="apple-touch-icon" href="/icons8-feed-50.png" />
      </head>
      <body className={inter.className}>
        <EmailProvider>{children}</EmailProvider>
        <Analytics />
        <SpeedInsights />
      </body>
      <GoogleAnalytics gaId={`${process.env.NEXT_PUBLIC_GOOGLE_ANALYTIC}`} />
    </html>
  );
}
