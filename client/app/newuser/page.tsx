"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar2 from "@/components/navbar2";
import Footer2 from "@/components/footer2";
import CookieConsent from "@/components/cookies";
import "@/app/newuser/newuser.css";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useEmail } from "@/context/UserContext";

export default function SelectCategories() {
  const { emailContext, setEmailContext } = useEmail();
  console.log("Email is", emailContext);
  const [categories, setCategories] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); // For loading spinner
  const router = useRouter(); // Use router for navigation
  const [timezone, setTimezone] = useState<string | null>(null);

  const availableCategories = [
    "Politics",
    "Geopolitics",
    "Finance",
    "AI",
    "Tech",
    "Crypto",
    "Meme",
    "Sports",
    "Entertainment",
  ];
  const availableTimes = ["Morning", "Afternoon", "Night"];

  // Detect user's time zone on component mount
  useEffect(() => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(userTimezone); // Set user's time zone in state
  }, []);

  const handleCategoryChange = (category: string) => {
    if (categories.includes(category)) {
      setCategories(categories.filter((c) => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  // On component mount, check if email is in localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("email");
    if (savedEmail) {
      setEmailContext(savedEmail);
    }
  }, []);

  useEffect(() => {
    console.log("email is", emailContext);
    if (emailContext) {
      localStorage.setItem("email", emailContext);
    } else localStorage.removeItem("email");
  }, [emailContext]);



  const handleTimeChange = (time: string) => {
    if (times.includes(time)) {
      setTimes(times.filter((t) => t !== time));
    } else {
      setTimes([...times, time]);
    }
  };

  const handleSubmit = async () => {
    // Handle submission logic
    if (categories.length === 0 || times.length === 0) {
      toast.error("Please select at least one category and one time");
      return;
    } else {
      setLoading(true);

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER}/updateUserPreferences`,
          {
            email: emailContext,
            timezone,
            categories,
            time: times,
          }
        );
        if (response.data.code == 0) {
          toast.success(
            "You have successfully signed up for FeedRecap, your first summary should be in your inbox shortly"
          );
          router.push("/dashboard");
        } else toast.error("Server error");
      } catch (err) {
        toast.error("Server error");
      }
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-black mainStart4">
      <Navbar2 />
      <Toaster />
      <div className="mainContainer3 pb-40 mt-28 ">
        <div className="card bg-base-100 w-120 shadow-xl cardDiv2">
          {/* Categories Section */}
          <div className="mt-2">
            <p className="text-lg tts">
              Select Categories You Want to Subscribe
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {availableCategories.map((category) => (
                <button
                  key={category}
                  className={`categoryButton ${
                    categories.includes(category) ? "active" : ""
                  }`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Time Section */}
          <div className="mt-2">
            <p className="text-lg tts">
              Select Times of the Day You Want to Receive a Summary
            </p>
            <div className="flex flex-wrap gap-2">
              {availableTimes.map((time) => (
                <button
                  key={time}
                  className={`timeButton ${
                    times.includes(time) ? "active" : ""
                  }`}
                  onClick={() => handleTimeChange(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {timezone && (
            <p className="text-center mt-4">Detected Timezone: {timezone}</p>
          )}

          <button className="btn btn-primary mb-4" onClick={handleSubmit}>
            {loading ? (
              <span className="loading loading-dots loading-md"></span>
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </div>
      <Footer2 />
      <CookieConsent />
    </div>
  );
}
