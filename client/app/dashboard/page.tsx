"use client";
import {
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
  useRef,
} from "react";
import axios from "axios";
import { useEmail } from "@/context/UserContext";
import Image from "next/image";
import _ from "lodash";
import Navbar3 from "@/components/navbar3";
import { ChevronLeft, ChevronRight, MessageCircle, X } from "lucide-react";

interface Post {
  username: string;
  time: string;
  likes: number;
  category: string;
  text: string;
  tweet_id: string;
  thumbnailUrl?: string;
  avatar?: string;
  isExpanded?: boolean;
}

interface UserProfile {
  username: string;
  avatar: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function Dashboard() {
  const { emailContext, setEmailContext } = useEmail();
  const [categories, setCategories] = useState<string[]>([]);
  const [time, setTime] = useState<string[]>([]);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [dbTimezone, setDbTimezone] = useState<string | null>(null);
  const [latestNewsletter, setLatestNewsletter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedTab, setSelectedTab] = useState("newsfeed");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [visiblePosts, setVisiblePosts] = useState(20);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [newProfile, setNewProfile] = useState("");
  const [wise, setWise] = useState<"categorywise" | "customProfiles">(
    "categorywise"
  );
  const [registeredWise, setRegisteredWise] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [cache, setCache] = useState<{ [key: string]: string[] }>({});
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<{
    [key: string]: boolean;
  }>({});
  const [loadingProfiles, setLoadingProfiles] = useState<boolean>(true);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const profilesContainerRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
  }, [setEmailContext]);

  useEffect(() => {
    if (emailContext) {
      localStorage.setItem("email", emailContext);
      fetchData();
    } else {
      localStorage.removeItem("email");
    }
  }, [emailContext]);

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(detectedTimezone);
  }, []);


  // Add ref for dropdown container
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modify the click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  

  const playSound = () => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Create Oscillator
    const oscillator = audioCtx.createOscillator();
    oscillator.type = "sine"; // Smooth & natural tone
    oscillator.frequency.setValueAtTime(180, audioCtx.currentTime); // Low & soft tick

    // Create Gain Node for volume control
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime); // Soft volume
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + 0.08
    ); // Quick decay

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Start and stop the oscillator quickly for a haptic "tick"
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.08); // 80ms short sound
  };

  const fetchUserProfile = async (username: string): Promise<UserProfile> => {
    let retries = 0;
    const maxRetries = 7;

    while (retries < maxRetries) {
      try {
        const response = await axios.get(
          "https://twitter-api45.p.rapidapi.com/screenname.php",
          {
            params: { screenname: username },
            headers: {
              "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPID_API_KEY,
              "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
            },
          }
        );

        // If we successfully get an avatar, return immediately
        if (response.data && response.data.avatar) {
          return { username, avatar: response.data.avatar };
        }

        // If we get a response but no avatar, throw an error to trigger a retry
        throw new Error("No avatar in response");
      } catch (error) {
        console.error(`Error fetching profile for ${username}:`, error);
        retries++;

        // If we've reached max retries, return with placeholder
        if (retries >= maxRetries) {
          return { username, avatar: "/placeholder.svg" };
        }

        // Wait for a short time before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // This line should never be reached due to the return in the if statement above,
    // but we'll keep it as a fallback
    return { username, avatar: "/placeholder.svg" };
  };

const fetchData = async () => {
  setPageLoading(true);
  setLoadingProfiles(true);
  setLoadingPosts(true);
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_SERVER}/data`, {
      params: { email: emailContext },
    });

    if (response.data.code === 0) {
      const userData = response.data.user;
      setCategories(userData.categories);
      setTime(userData.time);
      setDbTimezone(userData.timezone);
      setLatestNewsletter(userData.newsletter);
      setWise(userData.wise);
      setRegisteredWise(userData.wise);

      // ✅ Set profiles correctly since avatars are now provided
      setProfiles(
        userData.profiles.map((profile: string) => {
          // Find the first post that matches the profile username to get the avatar
          const matchedPost = response.data.posts.find(
            (post: { username: string }) => post.username === profile
          );

          return {
            username: profile,
            avatar: matchedPost?.avatar || "/placeholder.svg", // ✅ Extract avatar from posts or use placeholder
          };
        })
      );

      // ✅ Set posts correctly
      const sortedPosts = response.data.posts.sort(
        (a: Post, b: Post) =>
          new Date(b.time).getTime() - new Date(a.time).getTime()
      );
      setPosts(sortedPosts);
    } else {
      showNotification("Error loading data.", "error");
    }
  } catch (err) {
    console.error("Error fetching data:", err);
    showNotification("Error fetching data.", "error");
  } finally {
    setLoadingProfiles(false);
    setLoadingPosts(false);
    setPageLoading(false);
  }
};


  const handleAddProfile = async (suggestion: string) => {
    playSound();
    if (profiles.some((profile) => profile.username === suggestion)) {
      showNotification("Profile already added.", "error");
      return;
    }

    const newProfile = await fetchUserProfile(suggestion);
    setProfiles((prev) => [...prev, newProfile]);
    setNewProfile("");
    setShowDropdown(false);
  };

  const fetchSuggestions = async (keyword: string): Promise<string[]> => {
    try {
      const response = await axios.get(
        "https://twitter-api45.p.rapidapi.com/search.php",
        {
          params: { query: keyword, search_type: "People" },
          headers: {
            "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPID_API_KEY || "",
            "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
          },
        }
      );

      if (response.data && response.data.timeline) {
        return response.data.timeline
          .filter((item: any) => item.screen_name)
          .slice(0, 6)
          .map((item: any) => item.screen_name);
      } else {
        console.warn("No suggestions found for keyword:", keyword);
        return [];
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      return [];
    }
  };

  const debouncedSearch = useCallback(
    _.debounce(async (keyword: string) => {
      try {
        if (cache[keyword]) {
          setSuggestions(cache[keyword]);
        } else {
          const fetchedSuggestions = await fetchSuggestions(keyword);
          setSuggestions(fetchedSuggestions);
          setCache((prev) => ({ ...prev, [keyword]: fetchedSuggestions }));
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }

      setShowDropdown(true);
    }, 300),
    []
  );

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value;
    setNewProfile(input);

    setLoadingSuggestions(true);
    if (input.trim().length > 0) {
      debouncedSearch(input);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
      setLoadingSuggestions(false);
    }
  };

  const handleProfileUpdate = async () => {
    playSound();
    setPageLoading(true);
    setSelectedTab("newsfeed");
    setSelectedProfile(null);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateProfiles`,
        {
          email: emailContext,
          profiles: profiles.map((p) => p.username),
        }
      );
      if (response.data.code === 0) {
        setProfiles(
          response.data.profiles.map((profile: string) => {
            // Find the first post that matches the profile username to get the avatar
            const matchedPost = response.data.posts.find(
              (post: { username: string }) => post.username === profile
            );

            return {
              username: profile,
              avatar: matchedPost?.avatar || "/placeholder.svg", // ✅ Extract avatar from posts or use placeholder
            };
          })
        );

        // ✅ Set posts correctly
        const sortedPosts = response.data.posts.sort(
          (a: Post, b: Post) =>
            new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        setPosts(sortedPosts);
        showNotification("Profiles updated successfully!", "success");
      } else {
        showNotification("Error updating profiles.", "error");
      }
    } catch (err) {
      showNotification("Error updating profiles.", "error");
    } finally {
      setPageLoading(false);
    }
  };

  const handleCategoryUpdate = async () => {
    playSound();
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateCategories`,
        {
          email: emailContext,
          categories,
        }
      );
      await fetchData();
      if (response.data.code === 0) {
        showNotification("Categories Updated", "success");
      } else showNotification("Server Error", "error");
    } catch (err) {
      showNotification("Server Error", "error");
    }
  };

  const handleTimeUpdate = async () => {
    playSound();
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateTimes`,
        { email: emailContext, time }
      );
      if (response.data.code === 0) {
        showNotification("Times Updated", "success");
      } else showNotification("Server Error", "error");
    } catch (err) {
      showNotification("Server Error", "error");
    }
  };

  const toggleShowMore = () => {
    if (showAllPosts) {
      setVisiblePosts(20);
    } else {
      setVisiblePosts(posts.length);
    }
    setShowAllPosts(!showAllPosts);
  };

  const filteredPosts = posts.filter(
    (post) =>
      (selectedCategory ? post.category === selectedCategory : true) &&
      (selectedProfile ? post.username === selectedProfile : true)
  );

  const handleTimezoneUpdate = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateTimezone`,
        {
          email: emailContext,
          timezone,
        }
      );
      setLoading(false);
      if (response.data.code === 0)
        showNotification("Timezone Updated", "success");
      else showNotification("Server Error", "error");
    } catch (err) {
      showNotification("Server Error", "error");
    }
  };

  const SpinnerWithMessage = ({ message }: { message: string }) => {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-[#111] p-6 rounded-lg shadow-xl text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#7FFFD4] mx-auto mb-4"></div>
          <p className="text-[#7FFFD4]">{message}</p>
        </div>
      </div>
    );
  };

  const SkeletonLoader = () => {
    return (
      <div className="container mx-auto px-4 py-12">
        {/* Navigation Skeleton */}
        <div className="mb-8 flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex gap-8">
            <div className="h-8 w-20 rounded-md bg-gray-800"></div>
            <div className="h-8 w-20 rounded-md bg-gray-800"></div>
            <div className="h-8 w-20 rounded-md bg-gray-800"></div>
          </div>
        </div>

        {/* Filter Skeleton */}
        <div className="mb-6 flex overflow-x-auto gap-2 px-8">
          <div className="h-10 w-32 flex-shrink-0 rounded-full bg-gray-800"></div>
          <div className="h-10 w-28 flex-shrink-0 rounded-full bg-gray-800"></div>
          <div className="h-10 w-28 flex-shrink-0 rounded-full bg-gray-800"></div>
          <div className="h-10 w-28 flex-shrink-0 rounded-full bg-gray-800"></div>
        </div>

        {/* Posts Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-gray-800 bg-[#111] p-4 transition-all"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-800"></div>
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-gray-800"></div>
                  <div className="h-3 w-16 rounded bg-gray-800"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-800"></div>
                <div className="h-4 w-full rounded bg-gray-800"></div>
                <div className="h-4 w-3/4 rounded bg-gray-800"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const PostSkeleton = () => {
    return (
      <div className="post-card overflow-hidden rounded-xl border border-gray-800 bg-[#111] p-4 transition-all">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-800"></div>
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-gray-800"></div>
              <div className="h-3 w-16 rounded bg-gray-800"></div>
            </div>
          </div>
          <div className="h-6 w-20 rounded-full bg-gray-800"></div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full rounded bg-gray-800"></div>
          <div className="h-4 w-full rounded bg-gray-800"></div>
          <div className="h-4 w-3/4 rounded bg-gray-800"></div>
        </div>
        <div className="h-4 w-24 rounded bg-gray-800"></div>
      </div>
    );
  };

  const handleFeedTypeUpdate = async () => {
    playSound();
    if (wise === "customProfiles" && profiles.length < 3) {
      showNotification(
        "Please add at least 3 followed profiles to switch to Custom Profiles.",
        "error"
      );
      return;
    }

    if (wise === "categorywise" && categories.length === 0) {
      showNotification(
        "Please select at least 1 category to switch to Category-wise feed.",
        "error"
      );
      return;
    }

    setPageLoading(true);
    setSelectedTab("newsfeed");
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateFeedType`,
        {
          email: emailContext,
          wise,
          categories: wise === "categorywise" ? categories : [],
          profiles:
            wise === "customProfiles" ? profiles.map((p) => p.username) : [],
        }
      );

      if (response.data.code === 0) {
        setRegisteredWise(wise);
        await fetchData();

        setTimeout(() => {
          setPageLoading(false);
          showNotification("Dashboard updated with new feed type", "success");
        }, 5000);
      } else {
        showNotification("Error updating feed type.", "error");
      }
    } catch (err) {
      console.error("Error updating feed type:", err);
      showNotification("Error updating feed type.", "error");
    } finally {
      setLoading(false);
    }
  };

  function formatTime(date: string | number | Date): string {
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    return new Date(date).toLocaleTimeString("en-US", options);
  }

  function timeAgo(date: string | number | Date) {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000
    );
    let interval = Math.floor(seconds / 31536000);

    if (interval >= 1)
      return interval + " year" + (interval > 1 ? "s" : "") + " ago";
    if ((interval = Math.floor(seconds / 2592000)) >= 1)
      return interval + " month" + (interval > 1 ? "s" : "") + " ago";
    if ((interval = Math.floor(seconds / 86400)) >= 1)
      return interval + " day" + (interval > 1 ? "s" : "") + " ago";
    if ((interval = Math.floor(seconds / 3600)) >= 1)
      return interval + " hour" + (interval > 1 ? "s" : "") + " ago";
    if ((interval = Math.floor(seconds / 60)) >= 1)
      return interval + " minute" + (interval > 1 ? "s" : "") + " ago";
    return Math.floor(seconds) + " seconds ago";
  }

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const togglePostExpansion = (tweetId: string) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [tweetId]: !prev[tweetId],
    }));
  };

  const renderPostText = (text: string, tweetId: string) => {
    const shouldTruncate = text.length > 250;
    const isExpanded = expandedPosts[tweetId];

    if (!shouldTruncate) {
      return <p className="mb-4">{text}</p>;
    }

    return (
      <div>
        <p className="mb-2">{isExpanded ? text : `${text.slice(0, 250)}...`}</p>
        <button
          onClick={() => togglePostExpansion(tweetId)}
          className="text-sm text-[#7FFFD4] hover:underline"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </button>
      </div>
    );
  };

  const renderAvatar = (username: string, avatar: string) => {
    if (avatar && avatar !== "/placeholder.svg") {
      return (
        <Image
          src={avatar || "/placeholder.svg"}
          alt={username}
          width={24}
          height={24}
          className="rounded-full"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      );
    }

  };

  const renderAvatar2 = (username: string, avatar: string) => {
    if (avatar && avatar !== "/placeholder.svg") {
      return (
        <Image
          src={avatar || "/placeholder.svg"}
          alt={username}
          width={40}
          height={40}
          className="rounded-full"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      );
    }

  };

  const scrollProfiles = (direction: "left" | "right") => {
    if (profilesContainerRef.current) {
      const scrollAmount = 200; // Adjust this value to control scroll distance
      profilesContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleSendMessage = async () => {
    playSound();
    if (!userInput.trim()) return;

    const newUserMessage: ChatMessage = { role: "user", content: userInput };
    setChatMessages((prev) => [...prev, newUserMessage]);
    setUserInput("");
    setIsTyping(true);

    try {
      const prompt = `Based on the following tweets, please provide a concise answer to this question: "${userInput}". If you can't answer based on the tweets, please say so. Here are the tweets: ${JSON.stringify(
        posts
      )}`;

      const options = {
        method: "POST",
        url: "https://deepseek-v31.p.rapidapi.com/",
        headers: {
          "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPID_API_KEY,
          "x-rapidapi-host": "deepseek-v31.p.rapidapi.com",
          "Content-Type": "application/json",
        },
        data: {
          model: "deepseek-v3",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        },
      };

      const response = await axios.request(options);
      let aiResponse = response.data.choices[0].message.content;

      // Clean up the AI response
      aiResponse = aiResponse.replace(/\*/g, ""); // Remove single asterisks
      aiResponse = aiResponse.replace(/\[|\]/g, ""); // Remove square brackets
      aiResponse = aiResponse.replace(/_{1,2}([^_]+)_{1,2}/g, "$1"); // Remove underscores for italic/bold
      aiResponse = aiResponse.replace(/`([^`]+)`/g, "$1"); // Remove backticks for code
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse },
      ]);
      playSound();
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process your request. Please try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const resetChat = () => {
    setChatMessages([]);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, []);

 const formatNewsletter = (newsletter: string | null): string => {
   if (!newsletter) return "<p>No newsletters available.</p>";

   // Find the "TOP POSTS OF TODAY" section
   const topPostsIndex = newsletter.indexOf("TOP POSTS OF TODAY:");
   if (topPostsIndex === -1) return newsletter; // If no top posts section, return as is

   // Split newsletter into before and after "TOP POSTS OF TODAY"
   const beforeTopPosts = newsletter.slice(0, topPostsIndex);
   const topPostsSection = newsletter.slice(topPostsIndex);

   // Extract each post that ends with "View Post"
   const postRegex = /^(.*?View Post)$/gm;
   const postLines = Array.from(topPostsSection.matchAll(postRegex)).map(
     (match) => match[0]
   );

   // Convert to an ordered list format
   const numberedPosts = postLines
     .map((line, index) => `<li>${line.trim()}</li>`)
     .join("");

   // Replace old list with new `<ol>` format
   return `
    ${beforeTopPosts}
    <h3>TOP POSTS OF TODAY:</h3>
    <ol>
      ${numberedPosts}
    </ol>
  `;
 };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar3 />
      {pageLoading ? (
        <SkeletonLoader />
      ) : (
        <div className="container mx-auto px-4 py-12">
          {notification && (
            <div
              className={`fixed top-4 right-4 p-4 rounded-lg ${
                notification.type === "success"
                  ? "bg-[#7FFFD4] text-black"
                  : "bg-red-500 text-white"
              }`}
            >
              {notification.message}
            </div>
          )}

          {/* Navigation */}
          <nav className="mb-8 flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex gap-8">
              <button
                onClick={() => setSelectedTab("newsfeed")}
                className={`text-lg transition-colors ${
                  selectedTab === "newsfeed"
                    ? "text-[#7FFFD4]"
                    : "text-gray-400 hover:text-[#7FFFD4]"
                }`}
              >
                Newsfeed
              </button>
              <button
                onClick={() => setSelectedTab("newsletter")}
                className={`text-lg transition-colors ${
                  selectedTab === "newsletter"
                    ? "text-[#7FFFD4]"
                    : "text-gray-400 hover:text-[#7FFFD4]"
                }`}
              >
                Newsletter
              </button>
              <button
                onClick={() => setSelectedTab("settings")}
                className={`text-lg transition-colors ${
                  selectedTab === "settings"
                    ? "text-[#7FFFD4]"
                    : "text-gray-400 hover:text-[#7FFFD4]"
                }`}
              >
                Settings
              </button>
            </div>
          </nav>

          {selectedTab === "newsfeed" && (
            <div className="newsfeed-content">
              <div className="relative mb-6">
                <button
                  onClick={() => scrollProfiles("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-[#7FFFD4]" />
                </button>

                <div className="relative overflow-x-hidden ml-2 mr-2">
                  <div
                    ref={profilesContainerRef}
                    className="flex gap-2 overflow-x-auto scrollbar-hide whitespace-nowrap px-8"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {loadingProfiles ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={index}
                          className="inline-flex h-10 w-32 items-center rounded-full border border-gray-800 bg-[#111]"
                        />
                      ))
                    ) : wise === "categorywise" ? (
                      <>
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                            !selectedCategory
                              ? "bg-[#7FFFD4] text-black"
                              : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                          }`}
                        >
                          All Categories
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                              selectedCategory === category
                                ? "bg-[#7FFFD4] text-black"
                                : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setSelectedProfile(null)}
                          className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                            !selectedProfile
                              ? "bg-[#7FFFD4] text-black"
                              : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                          }`}
                        >
                          All Profiles
                        </button>
                        {profiles.map((profile) => (
                          <button
                            key={profile.username}
                            onClick={() => setSelectedProfile(profile.username)}
                            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap max-w-[200px] ${
                              selectedProfile === profile.username
                                ? "bg-[#7FFFD4] text-black"
                                : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                            }`}
                          >
                            {renderAvatar(profile.username, profile.avatar)}
                            <span className="ml-2 truncate">
                              @{profile.username}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => scrollProfiles("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-[#7FFFD4]" />
                </button>
              </div>
              <div className="post-grid grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loadingPosts ||
                (filteredPosts.length === 0 && posts.length === 0) ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <PostSkeleton key={index} />
                  ))
                ) : filteredPosts.length > 0 ? (
                  filteredPosts.slice(0, visiblePosts).map((post) => (
                    <div
                      key={post.tweet_id}
                      className="post-card overflow-hidden rounded-xl border border-gray-800 bg-[#111] p-4 transition-all hover:border-[#7FFFD4]/30"
                    >
                      <div className="post-header mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* 🔥 Ensure avatar comes from profiles */}
                          {renderAvatar2(
                            post.username,
                            post.avatar || "/placeholder.svg"
                          )}
                          <div>
                            <h3 className="font-medium">@{post.username}</h3>
                            <span className="text-sm text-gray-400">
                              {formatTime(post.time)}
                            </span>
                          </div>
                        </div>
                        {wise === "categorywise" && (
                          <span className="rounded-full bg-[#7FFFD4]/10 px-3 py-1 text-sm text-[#7FFFD4]">
                            {post.category}
                          </span>
                        )}
                      </div>
                      {renderPostText(post.text, post.tweet_id)}
                      <a
                        href={`https://twitter.com/i/web/status/${post.tweet_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[#7FFFD4] hover:underline"
                      >
                        View Post
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-400">No posts found.</p>
                  </div>
                )}
              </div>

              {posts.length > 10 && (
                <div className="mt-8 flex justify-center">
                  <button
                    className="rounded-full bg-[#7FFFD4] px-6 py-2 text-black transition-opacity hover:opacity-90"
                    onClick={toggleShowMore}
                  >
                    {showAllPosts ? "Show Less" : "Show More"}
                  </button>
                </div>
              )}
            </div>
          )}

          {selectedTab === "settings" && (
            <div className="settings-content space-y-8 rounded-xl border border-gray-800 bg-[#111] p-6">
              {/* Feed Type Selection */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-[#7FFFD4]">
                  Feed Type
                </h2>
                <div className="flex gap-4">
                  <button
                    className={`rounded-full px-6 py-2 transition-colors ${
                      wise === "categorywise"
                        ? "bg-[#7FFFD4] text-black"
                        : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                    }`}
                    onClick={() => setWise("categorywise")}
                  >
                    Category-wise
                  </button>
                  <button
                    className={`rounded-full px-6 py-2 transition-colors ${
                      wise === "customProfiles"
                        ? "bg-[#7FFFD4] text-black"
                        : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                    }`}
                    onClick={() => setWise("customProfiles")}
                  >
                    Custom Profiles
                  </button>
                </div>
                <button
                  className="mt-4 rounded-full bg-black px-28 py-2 text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
                  onClick={handleFeedTypeUpdate}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Feed Type"}
                </button>
              </section>

              {/* Update Categories Section */}
              <section
                className={`space-y-4 ${
                  wise === "customProfiles" ? "opacity-50" : ""
                }`}
              >
                <h2 className="text-xl font-semibold text-[#7FFFD4]">
                  Update Categories
                </h2>
                {wise === "customProfiles" && (
                  <p className="text-gray-400">
                    Switch to <strong>Category-wise feed</strong> to update
                    categories.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      className={`rounded-full px-4 py-2 text-sm transition-colors ${
                        categories.includes(category)
                          ? "bg-[#7FFFD4] text-black"
                          : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                      }`}
                      onClick={() =>
                        setCategories((prev) =>
                          prev.includes(category)
                            ? prev.filter((c) => c !== category)
                            : [...prev, category]
                        )
                      }
                      disabled={loading || wise === "customProfiles"}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                {wise === "categorywise" &&
                  registeredWise === "categorywise" && (
                    <button
                      className="mt-4 rounded-full bg-black px-20 py-2 text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
                      onClick={handleCategoryUpdate}
                      disabled={loading}
                    >
                      {loading ? "Updating..." : "Update Categories"}
                    </button>
                  )}
              </section>

              {/* Manage Followed Profiles Section */}
              <section
                className={`space-y-4 ${
                  wise === "categorywise" ? "opacity-50" : ""
                }`}
              >
                <h2 className="text-xl font-semibold text-[#7FFFD4]">
                  Manage Followed Profiles
                </h2>
                {wise === "categorywise" && (
                  <p className="text-gray-400">
                    Switch to <strong>Custom Profiles</strong> to manage
                    followed profiles.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {profiles.map((profile) => (
                    <div
                      key={profile.username}
                      className="flex items-center gap-2 rounded-full border border-[#7FFFD4] px-4 py-2 text-sm"
                    >
                      {renderAvatar(profile.username, profile.avatar)}
                      <span>@{profile.username}</span>
                      <button
                        className="text-gray-400 hover:text-white"
                        onClick={() =>
                          setProfiles((prev) =>
                            prev.filter((p) => p.username !== profile.username)
                          )
                        }
                        disabled={loading || wise === "categorywise"}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {wise === "customProfiles" && (
                  <div className="relative mt-4">
                    <input
                      type="text"
                      value={newProfile}
                      onChange={handleSearchInputChange}
                      placeholder="@username"
                      className="w-full rounded-lg border border-gray-800 bg-black px-4 py-2 text-white placeholder-gray-400 focus:border-[#7FFFD4] focus:outline-none"
                      disabled={loading}
                    />
                    {showDropdown && (
                      <ul className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-gray-800 bg-black">
                        {loadingSuggestions ? (
                          <li className="p-2 text-gray-400">Loading...</li>
                        ) : suggestions.length > 0 ? (
                          suggestions.map((suggestion, index) => (
                            <li
                              key={index}
                              className="cursor-pointer p-2 hover:bg-[#7FFFD4]/10"
                              onClick={() => handleAddProfile(suggestion)}
                            >
                              @{suggestion}
                            </li>
                          ))
                        ) : (
                          <li className="p-2 text-gray-400">No result found</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
                {wise === "customProfiles" &&
                  registeredWise === "customProfiles" && (
                    <button
                      className="mt-4 rounded-full bg-black px-20 py-2 text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
                      onClick={handleProfileUpdate}
                      disabled={loading}
                    >
                      {loading ? "Updating..." : "Update Profiles"}
                    </button>
                  )}
              </section>

              {/* Update Time Section */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-[#7FFFD4]">
                  Update Preferred Time
                </h2>
                <div className="flex flex-wrap gap-2">
                  {availableTimes.map((timeOption) => (
                    <button
                      key={timeOption}
                      className={`rounded-full px-4 py-2 text-sm transition-colors ${
                        time.includes(timeOption)
                          ? "bg-[#7FFFD4] text-black"
                          : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                      }`}
                      onClick={() =>
                        setTime((prev) =>
                          prev.includes(timeOption)
                            ? prev.filter((t) => t !== timeOption)
                            : [...prev, timeOption]
                        )
                      }
                      disabled={loading}
                    >
                      {timeOption}
                    </button>
                  ))}
                </div>
                <button
                  className="mt-4 rounded-full bg-black px-20 py-2 text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
                  onClick={handleTimeUpdate}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Time"}
                </button>
              </section>
            </div>
          )}

          {selectedTab === "newsletter" && (
            <div className="space-y-4 rounded-xl border border-gray-800 bg-black p-6">
              <h3 className="text-xl font-semibold text-[#7FFFD4]">
                Latest Newsletter
              </h3>
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html:
                    latestNewsletter || "<p>No newsletters available.</p>",
                }}
              />
            </div>
          )}

          {/* Floating Chat Button */}
          {wise === "customProfiles" && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="fixed bottom-6 right-6 bg-[#7FFFD4] text-black p-4 rounded-full shadow-lg hover:bg-[#00CED1] transition-colors"
            >
              <MessageCircle size={24} />
            </button>
          )}

          {/* Chat Modal */}
          {isChatOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-[#111] rounded-lg w-full max-w-lg mx-auto overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-800">
                  <h3 className="text-xl font-semibold text-[#7FFFD4]">
                    Ask FeedRecap AI
                  </h3>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-yellow-400  text-sm mb-2">
                    Warning: Responses will be based on your followed profiles
                    posts from last 24 hours
                  </p>
                  <div
                    ref={chatContainerRef}
                    className="chat-messages space-y-4 max-h-[50vh] overflow-y-auto mb-4"
                  >
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg p-3 ${
                            message.role === "user"
                              ? "bg-[#7FFFD4] text-black"
                              : "bg-gray-800 text-white"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-800 text-white rounded-lg p-3">
                          <span className="typing-animation">...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                      placeholder="Ask a question..."
                      className="w-full rounded-lg border border-gray-800 bg-black px-4 py-2 text-white placeholder-gray-400 focus:border-[#7FFFD4] focus:outline-none"
                    />
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleSendMessage}
                        className="flex-1 rounded-lg bg-[#7FFFD4] px-4 py-2 text-black transition-colors hover:bg-[#00CED1]"
                      >
                        Send
                      </button>
                      <button
                        onClick={resetChat}
                        className="flex-1 rounded-lg border border-[#7FFFD4] px-4 py-2 text-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
