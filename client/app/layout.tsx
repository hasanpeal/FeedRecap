"use client";
import type { Metadata } from "next";
import Head from "next/head";
import { Inter } from "next/font/google";
import { EmailProvider } from "@/context/UserContext";
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
          content="Signez is a real-time sign language learning platform that uses advanced machine learning models to provide accurate predictions."
        />
      </head>
      <body className={inter.className}>
        <EmailProvider>{children}</EmailProvider>
      </body>
    </html>
  );
}
