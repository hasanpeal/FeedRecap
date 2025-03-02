"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "@/components/navbar";
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
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {error ? (
            <p className="text-red-500 text-lg">{error}</p>
          ) : newsletterContent ? (
            <div className="space-y-4 rounded-xl border border-gray-800 bg-[#111] p-6">
              <h2 className="text-2xl font-semibold text-[#7FFFD4] mb-4">
                Newsletter Content
              </h2>
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: newsletterContent }}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#7FFFD4]"></div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
