"use client";
import React, { useState, useEffect } from "react";
import Navbar3 from "@/components/navbar3";
import Footer2 from "@/components/footer2";
import axios from "axios";
import { useEmail } from "@/context/UserContext";
import { Toaster, toast } from "react-hot-toast";
import "@/app/dashboard/dashboard.css";

export default function Dashboard() {
  const { emailContext, setEmailContext } = useEmail();
  const [categories, setCategories] = useState<string[]>([]);
  const [time, setTime] = useState<string[]>([]);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [dbTimezone, setDbTimezone] = useState<string | null>(null);
  const [totalNewsletters, setTotalNewsletters] = useState(0);
  const [latestNewsletter, setLatestNewsletter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const availableCategories = [
    "Politics",
    "Geopolitics",
    "Finance",
    "AI",
    "Tech",
    "Crypto",
    "Meme"
  ];
  const availableTimes = ["Morning", "Afternoon", "Night"];

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
      fetchData();
    } else localStorage.removeItem("email");
  }, [emailContext]);

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(detectedTimezone); // Store the detected timezone in state
    console.log("Detected Timezone:", detectedTimezone); // Debugging
  }, []);

  const fetchData = async () => {
    try {
      const categoriesRes = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/getCategories`,
        {
          params: { email: emailContext },
        }
      );
      const timesRes = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/getTimes`,
        {
          params: { email: emailContext },
        }
      );
      const timezoneRes = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/getTimezone`,
        {
          params: { email: emailContext },
        }
      );
      const totalNewslettersRes = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/getTotalNewsletters`,
        {
          params: { email: emailContext },
        }
      );
      const newsletterRes = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/getNewsletter`,
        {
          params: { email: emailContext },
        }
      );

      setCategories(categoriesRes.data.categories);
      setTime(timesRes.data.time);
      setDbTimezone(timezoneRes.data.timezone);
      setTotalNewsletters(totalNewslettersRes.data.totalnewsletter);
      setLatestNewsletter(newsletterRes.data.newsletter);
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      console.log(
        categories,
        time,
        dbTimezone,
        totalNewsletters,
        latestNewsletter,
        timezone
      );
    } catch (err) {
      toast.error("Error fetching user data.");
      console.log("ERROR:", err);
    }
  };

  const handleCategoryUpdate = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateCategories`,
        {
          email: emailContext,
          categories,
        }
      );
      setLoading(false);
      if (response.data.code == 0) toast.success("Categories Updated");
      else toast.error("Server Error");
    } catch (err) {
      toast.error("Server Error");
    }
  };

  const handleTimeUpdate = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateTimes`,
        { email: emailContext, time }
      );
      setLoading(false);
      if (response.data.code == 0) toast.success("Times Updated");
      else toast.error("Server Error");
    } catch (err) {
      toast.error("Server Error");
    }
  };

  const handleTimezoneUpdate = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateTimezone`,
        { email: emailContext, timezone }
      );
      setLoading(false);
      if (response.data.code == 0) toast.success("Timezone Updated");
      else toast.error("Server Error");
    } catch (err) {
      toast.error("Server Error");
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-black min-h-screen mainCont">
      <Navbar3 />
      <div className="container mx-auto px-6 py-12">
        <Toaster />
        <h1 className="text-center text-3xl font-bold text-white mb-8">
          Dashboard
        </h1>

        {/* Card for categories and times */}
        <div className="dashboard-card">
          <section>
            <h2 className="section-title">&nbsp;Update Categories</h2>
            <div className="categories-box">
              {availableCategories.map((category) => (
                <button
                  key={category}
                  className={`category-button ${
                    categories.includes(category) ? "active" : ""
                  }`}
                  onClick={() =>
                    setCategories((prev) =>
                      prev.includes(category)
                        ? prev.filter((c) => c !== category)
                        : [...prev, category]
                    )
                  }
                >
                  {category}
                </button>
              ))}
            </div>
            <button
              className="action-button"
              onClick={handleCategoryUpdate}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Categories"}
            </button>
          </section>

          <section className="mt-8">
            <h2 className="section-title">&nbsp;Update Preferred Time</h2>
            <div className="categories-box">
              {availableTimes.map((timeOption) => (
                <button
                  key={timeOption}
                  className={`category-button ${
                    time.includes(timeOption) ? "active" : ""
                  }`}
                  onClick={() =>
                    setTime((prev) =>
                      prev.includes(timeOption)
                        ? prev.filter((t) => t !== timeOption)
                        : [...prev, timeOption]
                    )
                  }
                >
                  {timeOption}
                </button>
              ))}
            </div>
            <button
              className="action-button"
              onClick={handleTimeUpdate}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Time"}
            </button>
          </section>

          <section className="mt-8">
            <h2 className="section-title">&nbsp;Timezone</h2>
            <p>&nbsp;Current Detected Timezone: {timezone}</p>
            <p>&nbsp;Registered timzone: {dbTimezone}</p>
            {timezone !== dbTimezone && (
              <button
                className="action-button bg-red-500 text-white mt-4"
                onClick={handleTimezoneUpdate}
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Timezone"}
              </button>
            )}
          </section>
        </div>

        {/* Newsletter Stats */}
        <div className="dashboard-card mt-8">
          <h2 className="section-title">&nbsp;Newsletter Information</h2>
          <div className="stats-box">
            <div className="stat-card">
              <h3 className="stat-title">Total Newsletters Received</h3>
              <p className="stat-value">{totalNewsletters}</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-title">Latest Newsletter</h3>
              <div
                className="stat-text"
                dangerouslySetInnerHTML={{
                  __html:
                    latestNewsletter || "<p>No newsletters available.</p>",
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <Footer2 />
    </div>
  );
}
