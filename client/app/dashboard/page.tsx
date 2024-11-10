"use client";
import React, { useState, useEffect } from "react";
import Navbar3 from "@/components/navbar3";
import Footer2 from "@/components/footer2";
import axios from "axios";
import { useEmail } from "@/context/UserContext";
import { Toaster, toast } from "react-hot-toast";
import Image from "next/image";
import { FaHeart } from "react-icons/fa";
import "@/app/dashboard/dashboard.css";

interface Post {
  username: string;
  time: string;
  likes: number;
  category: string;
  text: string;
  tweet_id: string;
  thumbnailUrl?: string;
}

export default function Dashboard() {
  const { emailContext, setEmailContext } = useEmail();
  const [categories, setCategories] = useState<string[]>([]);
  const [time, setTime] = useState<string[]>([]);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [dbTimezone, setDbTimezone] = useState<string | null>(null);
  const [totalNewsletters, setTotalNewsletters] = useState(0);
  const [latestNewsletter, setLatestNewsletter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedTab, setSelectedTab] = useState("newsfeed");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  useEffect(() => {
    const savedEmail = localStorage.getItem("email");
    if (savedEmail) {
      setEmailContext(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (emailContext) {
      localStorage.setItem("email", emailContext);
      fetchData();
      fetchPosts();
    } else {
      localStorage.removeItem("email");
    }
  }, [emailContext]);

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(detectedTimezone);
  }, []);

  const fetchData = async () => {
    try {
      const [
        categoriesRes,
        timesRes,
        timezoneRes,
        totalNewslettersRes,
        newsletterRes,
      ] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_SERVER}/getCategories`, {
          params: { email: emailContext },
        }),
        axios.get(`${process.env.NEXT_PUBLIC_SERVER}/getTimes`, {
          params: { email: emailContext },
        }),
        axios.get(`${process.env.NEXT_PUBLIC_SERVER}/getTimezone`, {
          params: { email: emailContext },
        }),
        axios.get(`${process.env.NEXT_PUBLIC_SERVER}/getTotalNewsletters`, {
          params: { email: emailContext },
        }),
        axios.get(`${process.env.NEXT_PUBLIC_SERVER}/getNewsletter`, {
          params: { email: emailContext },
        }),
      ]);

      setCategories(categoriesRes.data.categories);
      setTime(timesRes.data.time);
      setDbTimezone(timezoneRes.data.timezone);
      setTotalNewsletters(totalNewslettersRes.data.totalnewsletter);
      setLatestNewsletter(newsletterRes.data.newsletter);
    } catch (err) {
      toast.error("Error fetching user data.");
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/api/posts`,
        {
          params: { email: emailContext },
        }
      );
      if (response.data.code === 0) {
        const postsWithThumbnails = await Promise.all(
          response.data.data.map(async (post: Post) => {
            const link = extractLink(post.text);
            const thumbnailUrl = link ? await fetchThumbnail(link) : undefined;
            return { ...post, thumbnailUrl };
          })
        );
        setPosts(postsWithThumbnails);
      } else {
        toast.error("Error loading posts.");
      }
    } catch (error) {
      toast.error("Error fetching posts.");
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
      if (response.data.code === 0) {
        toast.success("Categories Updated");
        await fetchData(); // Fetch updated data after category update
        await fetchPosts(); // Fetch updated posts after category update
      }
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
      if (response.data.code === 0) {
        toast.success("Times Updated");
        await fetchData(); // Fetch updated data after category update
        await fetchPosts(); // Fetch updated posts after category update
      }
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
      if (response.data.code === 0) toast.success("Timezone Updated");
      else toast.error("Server Error");
    } catch (err) {
      toast.error("Server Error");
    }
  };

  const extractLink = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  };

  const fetchThumbnail = async (url: string) => {
    try {
      const response = await axios.get(
        `https://api.linkpreview.net/?key=YOUR_API_KEY&q=${url}`
      );
      return response.data.image;
    } catch {
      return undefined;
    }
  };

  const filteredPosts = selectedCategory
    ? posts.filter((post) => post.category === selectedCategory)
    : posts;

  return (
    <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-black min-h-screen mainCont">
      <Navbar3 />
      <div className="container mx-auto px-6 py-12">
        <Toaster />

        {selectedTab === "newsfeed" && (
          <div className="newsfeed-content">
            <div className="category-filter">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`category1-button ${
                    selectedCategory === category ? "active" : ""
                  }`}
                  onClick={() =>
                    setSelectedCategory((prev) =>
                      prev === category ? null : category
                    )
                  }
                >
                  {category}
                </button>
              ))}
            </div>
            {filteredPosts.map((post) => (
              <div key={post.tweet_id} className="post-card">
                <div className="post-header">
                  <h3>@{post.username}</h3>
                  <span>{new Date(post.time).toLocaleString()}</span>
                </div>
                <p>{post.text}</p>
                {post.thumbnailUrl && (
                  <Image
                    src={post.thumbnailUrl}
                    alt="Post Thumbnail"
                    width={500}
                    height={300}
                    className="thumbnail"
                  />
                )}
                <div className="post-footer">
                  <div className="likes">
                    <FaHeart className="like-icon" /> {post.likes}
                  </div>
                  <a
                    href={`https://twitter.com/i/web/status/${post.tweet_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-post"
                  >
                    View Post
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === "newsletter" && (
          <div className="dashboard-card">
            <h2 className="section-title">Newsletter Information</h2>
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
        )}

        {selectedTab === "settings" && (
          <div className="dashboard-card">
            <section>
              <h2 className="section-title">Update Categories</h2>
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
              <h2 className="section-title">Update Preferred Time</h2>
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
              <h2 className="section-title">Timezone</h2>
              <p>Current Detected Timezone: {timezone}</p>
              <p>Registered Timezone: {dbTimezone}</p>
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
        )}
      </div>

      <div className="tab-navigation">
        <button
          onClick={() => setSelectedTab("newsfeed")}
          className={selectedTab === "newsfeed" ? "active-tab" : ""}
        >
          Newsfeed
        </button>
        <button
          onClick={() => setSelectedTab("newsletter")}
          className={selectedTab === "newsletter" ? "active-tab" : ""}
        >
          Newsletter
        </button>
        <button
          onClick={() => setSelectedTab("settings")}
          className={selectedTab === "settings" ? "active-tab" : ""}
        >
          Settings
        </button>
      </div>
    </div>
  );
}
