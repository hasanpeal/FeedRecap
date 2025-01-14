"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Footer from "@/components/footer";
import "@/app/readnewsletter/readnewsletter.css";

export default function ReadNewsletter({
  searchParams,
}: {
  searchParams: { [key: string]: string };
}) {
  const [newsletterContent, setNewsletterContent] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Extract the newsletter ID from the query params
  const newsletterId = searchParams.newsletter;

  useEffect(() => {
    if (!newsletterId) {
      setError("No newsletter ID provided.");
      return;
    }

    // Fetch newsletter content by ID
    const fetchNewsletter = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER}/newsletter/${newsletterId}`
        );
        setNewsletterContent(response.data.newsletter);
        console.log("NEWSLETTER REVCEIVED", response.data);
      } catch (err: any) {
        setError(
          err.response?.data ||
            "An error occurred while fetching the newsletter."
        );
      }
    };

    fetchNewsletter();
  }, [newsletterId]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 mainStart">
      {/* Navbar */}
      <header className="bg-white shadow-md">
        <div className="py-4 px-6 flex">
          <Link href="/" className="text-xl font-bold text-gray-800 flex-grow">
            FeedRecap
          </Link>
          <nav className="space-x-4 buttonss">
            <Link href="/signin">
              <button className="text-gray-800 font-semibold sButton">
                Sign In
              </button>
            </Link>
            <Link href="/signup">
              <button className="text-gray-800 font-semibold">Sign Up</button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-20 bg-white-200">
        <div className="max-w-7xl mx-auto px-6">
          {error ? (
            <p className="text-red-600 text-lg">{error}</p>
          ) : newsletterContent ? (
            <div
              className="newsletter-content text-gray-600 text-lg"
              dangerouslySetInnerHTML={{ __html: newsletterContent }}
            />
          ) : (
            <p className="text-gray-600 text-lg">
              Loading newsletter content...
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
