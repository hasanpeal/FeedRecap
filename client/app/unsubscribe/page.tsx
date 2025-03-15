"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";

export default function Unsubscribe() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribeUser = async () => {
      if (!email) {
        setStatus("error");
        setErrorMessage("No email provided");
        return;
      }

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER}/updateTimes`,
          { email, time: [] } // Empty array to indicate unsubscription
        );
        if (response.data.code === 0) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage("Server error occurred");
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage("Failed to process your request");
        console.error(err);
      }
    };

    unsubscribeUser();
  }, [email]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111] p-8 rounded-xl border border-gray-800 text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-[#7FFFD4] border-t-transparent rounded-full animate-spin mb-4"></div>
            <h1 className="text-2xl font-bold mb-4">Processing...</h1>
            <p className="text-gray-400">
              Please wait while we unsubscribe your email.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-[#7FFFD4] mb-4" />
            <h1 className="text-2xl font-bold mb-4">
              Unsubscribed Successfully
            </h1>
            <p className="text-gray-400 mb-6">
              You have been successfully unsubscribed from FeedRecap
              newsletters.
              {email && (
                <span className="block mt-2 text-sm">Email: {email}</span>
              )}
            </p>
            <Link href="/">
              <button className="flex items-center bg-transparent border border-[#7FFFD4] text-[#7FFFD4] font-medium  px-12 py-2 rounded-lg hover:bg-[#7FFFD4]/10 transition-all duration-300">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <XCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-4">Unsubscribe Failed</h1>
            <p className="text-gray-400 mb-6">
              {errorMessage || "We couldn't process your unsubscribe request."}
              {email && (
                <span className="block mt-2 text-sm">Email: {email}</span>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/">
                <button className="flex items-center bg-transparent border border-[#7FFFD4] text-[#7FFFD4] font-medium px-4 py-2 rounded-lg hover:bg-[#7FFFD4]/10 transition-all duration-300 w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Home
                </button>
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-[#7FFFD4] to-[#00CED1] text-black font-medium px-6 py-2 rounded-lg shadow-lg hover:shadow-[#7FFFD4]/20 transition-all duration-300 w-full"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
