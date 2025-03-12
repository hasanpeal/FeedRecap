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
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  X,
  UserPlus,
  Check,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
// Testing test setup
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
  mediaThumbnail?: string;
  video?: string;
  videoThumbnail?: string;
  quotedTweet?: {
    tweet_id: string;
    text: string;
    likes: number;
    createdAt: Date;
    mediaThumbnail: string;
    video: string;
    videoThumbnail: string;
    avatar: string;
    username: string;
  };
}

interface UserProfile {
  username: string;
  avatar: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Add this custom X logo component after the imports
const XLogo = ({ size = 24, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0,0,256,256"
    className={className}
  >
    <g
      fill="currentColor"
      fillRule="nonzero"
      stroke="none"
      strokeWidth="1"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      strokeMiterlimit="10"
      strokeDasharray=""
      strokeDashoffset="0"
      fontFamily="none"
      fontWeight="none"
      fontSize="none"
      textAnchor="none"
      style={{ mixBlendMode: "normal" }}
    >
      <g transform="scale(10.66667,10.66667)">
        <path d="M2.36719,3l7.0957,10.14063l-6.72266,7.85938h2.64063l5.26367,-6.16992l4.31641,6.16992h6.91016l-7.42187,-10.625l6.29102,-7.375h-2.59961l-4.86914,5.6875l-3.97266,-5.6875zM6.20703,5h2.04883l9.77734,14h-2.03125z"></path>
      </g>
    </g>
  </svg>
);

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
  // const [visiblePosts, setVisiblePosts] = useState(20);
  // const [showAllPosts, setShowAllPosts] = useState(false);
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
  const [newlatestNewsletter, setNewLatestNewsletter] = useState<string | null>(
    null
  );
  const [updatingFeed, setUpdatingFeed] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState("");
  const [isConnectingTwitter, setIsConnectingTwitter] = useState(false);
  const [twitterFollowing, setTwitterFollowing] = useState<any[]>([]);
  const [selectedTwitterAccounts, setSelectedTwitterAccounts] = useState<
    string[]
  >([]);
  const [showTwitterFollowing, setShowTwitterFollowing] = useState(false);
  const [isSavingTwitter, setIsSavingTwitter] = useState(false);

  // Add these new state variables after the existing state declarations
  const [twitterSuggestions, setTwitterSuggestions] = useState<string[]>([]);
  const [showTwitterDropdown, setShowTwitterDropdown] =
    useState<boolean>(false);
  const [loadingTwitterSuggestions, setLoadingTwitterSuggestions] =
    useState<boolean>(false);
  // Add this new state variable after the other state declarations
  const [unsavedProfiles, setUnsavedProfiles] = useState<boolean>(false);
  const [linkedTwitter, setLinkedTwitter] = useState<string | null>(null);
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
    setNewLatestNewsletter(
      latestNewsletter?.replace(
        "TOP POSTS OF TODAY:",
        "<p>&nbsp;</p><strong>TOP POSTS OF TODAY:</strong>"
      ) || ""
    );
  }, [latestNewsletter]);

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

  // Add a ref for the Twitter dropdown
  const twitterDropdownRef = useRef<HTMLDivElement>(null);

  // Add this useEffect for handling clicks outside the Twitter dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        twitterDropdownRef.current &&
        !twitterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTwitterDropdown(false);
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
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/data`,
        {
          params: { email: emailContext },
        }
      );

      if (response.data.code === 0) {
        const userData = response.data.user;
        setCategories(userData.categories);
        setTime(userData.time);
        setDbTimezone(userData.timezone);
        setLatestNewsletter(userData.newsletter);
        setWise(userData.wise);
        setRegisteredWise(userData.wise);
        setLinkedTwitter(
          userData.twitterUsername ? userData.twitterUsername : null
        );

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

  // const LikeGraph = ({ likes }: { likes: number }) => {
  //   const generatePath = () => {
  //     // Fake data pattern (adjust for realism)
  //     const points = [2, 5, 3, 7, 4, 8, 6, 12, 10, (likes % 20) + 2];
  //     const step = 20;

  //     return points
  //       .map((p, i) => `${i * step},${50 - p * 4}`) // Scale down for visual
  //       .join(" ");
  //   };

  //   return (
  //     <svg
  //       viewBox="0 0 200 50"
  //       className="w-16 h-6"
  //       xmlns="http://www.w3.org/2000/svg"
  //     >
  //       {/* Glow Effect */}
  //       <filter id="glow">
  //         <feGaussianBlur stdDeviation="3" result="coloredBlur" />
  //         <feMerge>
  //           <feMergeNode in="coloredBlur" />
  //           <feMergeNode in="SourceGraphic" />
  //         </feMerge>
  //       </filter>

  //       {/* Line */}
  //       <polyline
  //         points={generatePath()}
  //         stroke="#7FFFD4"
  //         strokeWidth="4"
  //         fill="none"
  //         strokeLinecap="round"
  //         filter="url(#glow)"
  //       />

  //       {/* Pulse Dot at End */}
  //       {/* <circle cx="180" cy="10" r="28" fill="#7FFFD4" filter="url(#glow)">
  //         <animate
  //           attributeName="r"
  //           values="4;6;4"
  //           dur="1s"
  //           repeatCount="indefinite"
  //         />
  //       </circle> */}
  //     </svg>
  //   );
  // };

  // Unlink Twitter account
  const handleUnlinkTwitter = async () => {
    setIsSavingTwitter(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_SERVER}/unlinkX`, {
        email: emailContext,
      });
      setLinkedTwitter(null);
      showNotification("Twitter account unlinked", "success");
    } catch (err) {
      showNotification("Error unlinking Twitter", "error");
    } finally {
      setIsSavingTwitter(false);
    }
  };

  const handleAddProfile = async (suggestion: string) => {
    playSound();
    if (profiles.some((profile) => profile.username === suggestion)) {
      showNotification("Profile already added.", "error");
      return;
    }

    // Add optimistic UI update
    const tempProfile = { username: suggestion, avatar: "/placeholder.svg" };
    setProfiles((prev) => [...prev, tempProfile]);
    setNewProfile("");
    setShowDropdown(false);

    // Fetch actual profile data in background
    try {
      const newProfile = await fetchUserProfile(suggestion);
      // Replace the temporary profile with the actual one
      setProfiles((prev) =>
        prev.map((p) => (p.username === suggestion ? newProfile : p))
      );
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Profile already added with placeholder, so no need to handle error specifically
    }
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
          .slice(0, 4) // Changed from 6 to 4
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
          setLoadingSuggestions(false);
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
    }, 300), // Changed from 300ms to 150ms
    [cache]
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

  // Add this debounced search function for Twitter username
  const debouncedTwitterSearch = useCallback(
    _.debounce(async (keyword: string) => {
      try {
        if (cache[keyword]) {
          setTwitterSuggestions(cache[keyword]);
          setLoadingTwitterSuggestions(false);
        } else {
          const fetchedSuggestions = await fetchSuggestions(keyword);
          setTwitterSuggestions(fetchedSuggestions);
          setCache((prev) => ({ ...prev, [keyword]: fetchedSuggestions }));
        }
      } catch (error) {
        console.error("Error fetching Twitter suggestions:", error);
        setTwitterSuggestions([]);
      } finally {
        setLoadingTwitterSuggestions(false);
      }

      setShowTwitterDropdown(true);
    }, 300),
    [cache]
  );

  // Add this function to handle Twitter username input changes
  const handleTwitterUsernameChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.target.value;
    // Remove @ if it's at the beginning of the input
    const cleanedInput = input.startsWith("@") ? input.substring(1) : input;
    setTwitterUsername(cleanedInput);
  };

  // Add this function to handle selecting a Twitter username suggestion
  const handleSelectTwitterUsername = (username: string) => {
    setTwitterUsername(username);
    setShowTwitterDropdown(false);
  };

  const handleProfileUpdateFn = async () => {
    playSound();
    setSelectedTab("newsfeed");
    setSelectedProfile(null);

    // Show updating notification instead of full page loading
    setUpdatingFeed(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateProfiles`,
        {
          email: emailContext,
          profiles: profiles.map((p) => p.username),
        }
      );
      if (response.data.code === 0) {
        fetchData();
        showNotification("Profiles updated successfully!", "success");
        // Reset unsavedProfiles after successful update
        setUnsavedProfiles(false);
      } else {
        showNotification("Error updating profiles.", "error");
      }
    } catch (err) {
      showNotification("Error updating profiles.", "error");
    } finally {
      setUpdatingFeed(false);
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

  // const toggleShowMore = () => {
  //   if (showAllPosts) {
  //     setVisiblePosts(20);
  //   } else {
  //     setVisiblePosts(posts.length);
  //   }
  //   setShowAllPosts(!showAllPosts);
  // };

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

  const handleFeedTypeUpdateFn = async () => {
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

    // Show updating notification instead of full page loading
    setUpdatingFeed(true);
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
        showNotification("Feed type updated successfully!", "success");
        // Reset unsavedProfiles after successful update
        setUnsavedProfiles(false);
      } else {
        showNotification("Error updating feed type.", "error");
      }
    } catch (err) {
      console.error("Error updating feed type:", err);
      showNotification("Error updating feed type.", "error");
    } finally {
      setUpdatingFeed(false);
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
    const initials = getInitials(username);
    return (
      <div className="w-6 h-6 bg-[#7FFFD4]/20 rounded-full flex items-center justify-center text-[#7FFFD4] font-bold text-xs">
        {initials}
      </div>
    );
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
    const initials = getInitials(username);
    return (
      <div className="w-10 h-10 bg-[#7FFFD4]/20 rounded-full flex items-center justify-center text-[#7FFFD4] font-bold">
        {initials}
      </div>
    );
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
      const response = await fetch("/api/deepseek", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userInput, posts }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to fetch response");

      let aiResponse = data.aiResponse;

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

  const getInitials = (username: string) => {
    return username
      .split(/[._-]/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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

  // ✅ Utility function to detect iOS devices
  const isIOS = () => {
    if (typeof navigator !== "undefined") {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
    return false;
  };

  const useVideoIntersectionObserver = () => {
    useEffect(() => {
      if (isIOS()) return;
      const videoElements = document.querySelectorAll(".post-video");

      if (!videoElements.length) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video = entry.target as HTMLVideoElement;

            if (!entry.isIntersecting && !video.paused) {
              // Pause video when it's out of view
              video.pause();
            }
          });
        },
        {
          root: null, // viewport
          rootMargin: "0px",
          threshold: 0.2, // 20% visibility required
        }
      );

      // Observe all video elements
      videoElements.forEach((video) => {
        observer.observe(video);
      });

      // Cleanup
      return () => {
        videoElements.forEach((video) => {
          observer.unobserve(video);
        });
      };
    }, [posts]); // Re-run when posts change
  };

  function renderQuotedTweet(quotedTweet: Post["quotedTweet"]) {
    if (!quotedTweet || !quotedTweet.username) return null;

    // Create a post object from the quotedTweet to use with renderMedia
    const quotedPostForMedia: Post = {
      ...quotedTweet,
      username: quotedTweet.username,
      time: quotedTweet.createdAt.toString(),
      category: "",
      tweet_id: quotedTweet.tweet_id,
      text: quotedTweet.text,
      likes: quotedTweet.likes,
      avatar: quotedTweet.avatar,
    };

    return (
      <div className="mt-2 mb-4 rounded-lg border border-gray-700  p-3">
        <div className="mb-2 flex items-center gap-3">
          {renderAvatar2(
            quotedTweet.username,
            quotedTweet.avatar || "/placeholder.svg"
          )}
          <div>
            <h3 className="font-medium">@{quotedTweet.username}</h3>
            <span className="text-sm text-gray-400">
              {formatTime(quotedTweet.createdAt)}
            </span>
          </div>
        </div>
        <p className="mb-3">
          {quotedTweet && quotedTweet.text
            ? quotedTweet.text.length > 150
              ? `${quotedTweet.text.slice(0, 150)}...`
              : quotedTweet.text
            : ""}
        </p>
        {renderMedia(quotedPostForMedia)}
      </div>
    );
  }

  const renderMedia = (post: Post) => {
    if (isIOS()) {
      if (post.video) {
        return (
          <div className="mb-4 mt-2 rounded-lg overflow-hidden">
            <Image
              src={
                post.videoThumbnail || "/placeholder.svg?height=240&width=400"
              }
              alt="Video Poster"
              width={500}
              height={240}
              className="object-cover rounded-lg border border-gray-800"
            />
          </div>
        );
      }
    }

    if (post.video) {
      // ✅ On non-iOS devices, render autoplaying video
      return (
        <div className="mb-4 mt-2 rounded-lg overflow-hidden">
          <div className="video-container relative w-full aspect-video rounded-lg">
            <video
              src={post.video}
              className="w-full h-auto object-contain rounded-lg border border-gray-800 post-video"
              controls
              // loop
              // playsInline
              // preload="metadata"
              controlsList="nodownload"
              poster={
                post.videoThumbnail || "/placeholder.svg?height=240&width=400"
              }
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      );
    } else if (post.mediaThumbnail) {
      // ✅ If no video, render media image
      return (
        <div className="mb-4 mt-2 rounded-lg border border-gray-800 overflow-hidden max-h-[500px] flex justify-center">
          <Image
            src={post.mediaThumbnail || "/placeholder.svg"}
            alt="Tweet media"
            width={500}
            height={240}
            className="object-cover rounded-lg"
          />
        </div>
      );
    }

    return null;
  };

  useVideoIntersectionObserver();

  const handleConnectTwitter = async () => {
    if (!twitterUsername) {
      showNotification("Please enter a Twitter username", "error");
      return;
    }

    playSound();
    setIsConnectingTwitter(true);

    try {
      // Fetch followed accounts from Twitter
      const response = await axios.request({
        method: "GET",
        url: "https://twitter-api45.p.rapidapi.com/following.php",
        params: { screenname: twitterUsername },
        headers: {
          "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPID_API_KEY || "",
          "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
        },
      });

      if (response.data && response.data.following) {
        setTwitterFollowing(response.data.following);
        setShowTwitterFollowing(true);
        showNotification(
          `Found ${response.data.following.length} accounts`,
          "success"
        );
        // ✅ Save Twitter username to DB after fetching followed accounts
        await axios.post(`${process.env.NEXT_PUBLIC_SERVER}/saveX`, {
          email: emailContext,
          twitterUsername,
        });

        setLinkedTwitter(twitterUsername);
        showNotification("Twitter account linked!", "success");
      } else {
        showNotification("No following accounts found", "error");
      }
    } catch (error) {
      console.error("Error fetching Twitter following:", error);
      showNotification("Error connecting to Twitter", "error");
    } finally {
      setIsConnectingTwitter(false);
    }
  };

  const handleSelectTwitterAccount = (screenName: string) => {
    setSelectedTwitterAccounts((prev) =>
      prev.includes(screenName)
        ? prev.filter((name) => name !== screenName)
        : [...prev, screenName]
    );
  };

  const handleShowFollowedProfiles = async () => {
    if (!linkedTwitter) return; // Ensure there is a linked account

    playSound();
    setIsConnectingTwitter(true);

    try {
      // Fetch followed accounts again on demand
      const response = await axios.request({
        method: "GET",
        url: "https://twitter-api45.p.rapidapi.com/following.php",
        params: { screenname: linkedTwitter },
        headers: {
          "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPID_API_KEY || "",
          "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
        },
      });

      if (response.data && response.data.following) {
        setTwitterFollowing(response.data.following);
        setShowTwitterFollowing(true);
        showNotification(
          `Loaded ${response.data.following.length} accounts`,
          "success"
        );
      } else {
        showNotification("No following accounts found", "error");
      }
    } catch (error) {
      console.error("Error fetching Twitter following:", error);
      showNotification("Error fetching followed profiles", "error");
    } finally {
      setIsConnectingTwitter(false);
    }
  };

  const handleAddSelectedAccounts = async () => {
    if (selectedTwitterAccounts.length === 0) {
      showNotification("Please select at least one account", "error");
      return;
    }

    playSound();
    setLoading(true);

    // Create a copy of current profiles
    const currentProfiles = [...profiles];

    // Add each selected account that isn't already in profiles
    for (const screenName of selectedTwitterAccounts) {
      if (!profiles.some((profile) => profile.username === screenName)) {
        try {
          // Find the account in twitterFollowing
          const account = twitterFollowing.find(
            (acc) => acc.screen_name === screenName
          );
          if (account) {
            const newProfile = {
              username: screenName,
              avatar: account.profile_image || "/placeholder.svg",
            };
            currentProfiles.push(newProfile);
          }
        } catch (error) {
          console.error(`Error adding profile for ${screenName}:`, error);
        }
      }
    }

    // Update profiles state
    setProfiles(currentProfiles);

    // Set unsavedProfiles to true to show the warning
    setUnsavedProfiles(true);

    // Reset Twitter following UI
    setShowTwitterFollowing(false);
    setSelectedTwitterAccounts([]);

    showNotification("Accounts added to your profiles", "success");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {updatingFeed && (
        <div className="fixed top-0 left-0 right-0 bg-[#7FFFD4] text-black py-2 px-4 text-center z-50">
          Updating dashboard...
        </div>
      )}
      {!updatingFeed && <Navbar3 />}
      {pageLoading ? (
        <SkeletonLoader />
      ) : (
        <div className="container mx-auto px-4 py-4 pb-16 ">
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
          <nav className="mb-8 flex items-center justify-center border-b border-gray-800 pb-4">
            <div className="flex gap-8 sm:gap-14">
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
              {/* Trending Section */}
              {/* 🔥 Trending Posts Section */}
              <div className="hidden md:block mb-8 mx-1">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <span className="mr-2">🔥</span> Trending Posts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {loadingPosts
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={index}
                          className="trending-card-skeleton rounded-xl border border-gray-800 bg-[#111] overflow-hidden"
                        >
                          <div className="h-32 bg-gray-800 animate-pulse"></div>
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-gray-800 animate-pulse"></div>
                              <div className="h-4 w-24 rounded bg-gray-800 animate-pulse"></div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="h-4 w-16 rounded bg-gray-800 animate-pulse"></div>
                              <div className="h-4 w-16 rounded bg-gray-800 animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      ))
                    : (() => {
                        const fourHoursAgo =
                          new Date().getTime() - 4 * 60 * 60 * 1000;
                        const recentPosts = posts.filter(
                          (post) =>
                            new Date(post.time).getTime() >= fourHoursAgo
                        );

                        // 🔹 Pick **top-liked** post per unique account (max 5 posts)
                        const uniqueTopPosts = [];
                        const seenUsernames = new Set();

                        for (const post of recentPosts.sort(
                          (a, b) => b.likes - a.likes
                        )) {
                          if (!seenUsernames.has(post.username)) {
                            uniqueTopPosts.push(post);
                            seenUsernames.add(post.username);
                          }
                          if (uniqueTopPosts.length === 5) break;
                        }

                        return uniqueTopPosts.length > 0 ? (
                          uniqueTopPosts.map((post) => (
                            <div
                              key={post.tweet_id}
                              className="relative trending-card rounded-xl border border-[#7FFFD4] bg-[#111] overflow-hidden hover:border-[#7FFFD4]/30 transition-all"
                            >
                              {post.mediaThumbnail || post.videoThumbnail ? (
                                <div className="h-32 overflow-hidden">
                                  <Image
                                    src={
                                      post.mediaThumbnail ||
                                      post.videoThumbnail ||
                                      "/placeholder.svg"
                                    }
                                    alt="Tweet media"
                                    width={300}
                                    height={128}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                              ) : (
                                <div className="h-32 flex items-center justify-center p-4">
                                  <p className="text-sm line-clamp-4 text-center">
                                    {post.text}
                                  </p>
                                </div>
                              )}
                              <div className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  {renderAvatar(
                                    post.username,
                                    post.avatar || "/placeholder.svg"
                                  )}
                                  <span className="text-sm font-medium truncate">
                                    @{post.username}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-[#7FFFD4]">
                                    {timeAgo(post.time)}
                                  </span>
                                  <a
                                    href={`https://twitter.com/i/web/status/${post.tweet_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[#7FFFD4] hover:underline"
                                  >
                                    View Post
                                  </a>
                                </div>
                              </div>

                              {/* 📊 Replaced LineChart with Custom Minimal Sparkline */}
                              {/* <div className="absolute bottom-5 left-0 w-full flex justify-end p-2">
                                <LikeGraph likes={post.likes} />
                              </div> */}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400">
                            No trending posts
                          </p>
                        );
                      })()}
                </div>
              </div>

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
                        {profiles
                          .filter((profile) =>
                            posts.some(
                              (post) => post.username === profile.username
                            )
                          )
                          .map((profile) => (
                            <button
                              key={profile.username}
                              onClick={() =>
                                setSelectedProfile(profile.username)
                              }
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
              <div className="sm:masonry-grid columns-1 md:columns-2 lg:columns-3 gap-4">
                {" "}
                {loadingPosts ||
                (filteredPosts.length === 0 && posts.length === 0) ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <PostSkeleton key={index} />
                  ))
                ) : filteredPosts.length > 0 ? (
                  filteredPosts.map(
                    (
                      post // Slice (0,20) was here
                    ) => (
                      <div
                        key={post.tweet_id}
                        className="post-card break-inside-avoid mb-4 overflow-hidden rounded-xl border border-gray-800 bg-[#111] p-4 transition-all hover:border-[#7FFFD4]/30"
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
                        {/* {post.mediaThumbnail && (
                        <div className="mb-4 mt-2 rounded-lg border border-gray-800 overflow-hidden max-h-[500px] flex justify-center">
                          <Image
                            src={post.mediaThumbnail || "/placeholder.svg"}
                            alt="Tweet media"
                            width={500}
                            height={240}
                            className="object-cover rounded-lg"
                            // style={{ maxHeight: "240px", width: "auto" }}
                          />
                        </div>
                      )} */}
                        {renderMedia(post)}
                        {post.quotedTweet &&
                          renderQuotedTweet(post.quotedTweet)}
                        <a
                          href={`https://twitter.com/i/web/status/${post.tweet_id}`} // Default browser fallback
                          onClick={(e) => {
                            e.preventDefault();
                            const tweetId = post.tweet_id;
                            const isMobile = /Mobi|Android|iPhone/i.test(
                              navigator.userAgent
                            );

                            if (isMobile) {
                              // Try opening in X app directly (NO confirmation prompt)
                              window.location.href = `twitter://status?id=${tweetId}`;

                              // If app is not installed, open in browser after a short delay
                              setTimeout(() => {
                                window.location.href = `https://twitter.com/i/web/status/${tweetId}`;
                              }, 500);
                            } else {
                              // Desktop: Always open in a new tab
                              window.open(
                                `https://twitter.com/i/web/status/${tweetId}`,
                                "_blank"
                              );
                            }
                          }}
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
                    )
                  )
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-400">No posts found.</p>
                  </div>
                )}
              </div>
              {/* {posts.length > 10 && (
                <div className="mt-8 flex justify-center">
                  <button
                    className="rounded-full bg-[#7FFFD4] px-6 py-2 text-black transition-opacity hover:opacity-90"
                    onClick={toggleShowMore}
                  >
                    {showAllPosts ? "Show Less" : "Show More"}
                  </button>
                </div>
              )} */}
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
                    Categories
                  </button>
                  <button
                    className={`rounded-full px-6 py-2 transition-colors ${
                      wise === "customProfiles"
                        ? "bg-[#7FFFD4] text-black"
                        : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                    }`}
                    onClick={() => setWise("customProfiles")}
                  >
                    Profiles
                  </button>
                </div>
                <button
                  className="mt-4 rounded-full bg-black px-14 py-2 text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
                  onClick={handleFeedTypeUpdateFn}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Feed Type"}
                </button>
              </section>

              {/* Twitter Integration Section */}
              <section className="space-y-4 border-t border-gray-800 pt-6">
                <h2 className="text-xl font-semibold text-[#7FFFD4] flex items-center gap-2">
                  Connect X Account
                </h2>

                {/* If user has linked a Twitter account */}
                {linkedTwitter ? (
                  <>
                    <p className="text-gray-400">
                      Connected as <strong>@{linkedTwitter}</strong>
                    </p>
                    <div className="flex gap-4">
                      <button
                        className="rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
                        onClick={handleUnlinkTwitter}
                        disabled={loading}
                      >
                        {loading ? "Unlinking..." : "Unlink X"}
                      </button>
                      <button
                        className="rounded-lg bg-black px-4 py-2 text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
                        onClick={() => handleShowFollowedProfiles()}
                      >
                        Show Followed Profiles
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400">
                      Connect your X account to import profiles you follow
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={twitterUsername}
                          onChange={handleTwitterUsernameChange}
                          placeholder="@YourUsername"
                          className="w-full rounded-lg border border-gray-800 bg-black px-4 py-2 text-white placeholder-gray-400 focus:border-[#7FFFD4] focus:outline-none"
                          disabled={isConnectingTwitter}
                        />
                      </div>
                      <button
                        className="rounded-lg bg-black px-4 py-2 text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black flex items-center justify-center gap-2"
                        onClick={handleConnectTwitter}
                        disabled={isConnectingTwitter || !twitterUsername}
                      >
                        {isConnectingTwitter ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <XLogo size={16} className="text-[#7FFFD4]" />
                            Connect
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {/* Show Followed Profiles UI when connected */}
                {showTwitterFollowing && (
                  <div className="mt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-[#7FFFD4]">
                        Select accounts to add ({selectedTwitterAccounts.length}{" "}
                        selected)
                      </h3>
                      <button
                        className="text-sm text-gray-400 hover:text-white"
                        onClick={() => setShowTwitterFollowing(false)}
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto rounded-lg border border-gray-800 bg-black p-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {twitterFollowing.map((account) => (
                          <div
                            key={account.screen_name}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedTwitterAccounts.includes(
                                account.screen_name
                              )
                                ? "bg-[#7FFFD4]/20 border border-[#7FFFD4]"
                                : "hover:bg-gray-900 border border-gray-800"
                            }`}
                            onClick={() =>
                              handleSelectTwitterAccount(account.screen_name)
                            }
                          >
                            <div className="relative flex-shrink-0">
                              <Image
                                src={
                                  account.profile_image || "/placeholder.svg"
                                }
                                alt={account.screen_name}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                              {selectedTwitterAccounts.includes(
                                account.screen_name
                              ) && (
                                <div className="absolute -right-1 -bottom-1 bg-[#7FFFD4] rounded-full p-0.5">
                                  <Check size={12} className="text-black" />
                                </div>
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-medium truncate">
                                {account.name}
                              </div>
                              <div className="text-sm text-gray-400 truncate">
                                @{account.screen_name}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      className="w-full rounded-lg bg-[#7FFFD4] px-4 py-2 text-black transition-colors hover:bg-[#7FFFD4]/90 flex items-center justify-center gap-2"
                      onClick={handleAddSelectedAccounts}
                      disabled={selectedTwitterAccounts.length === 0}
                    >
                      <UserPlus size={16} />
                      Add {selectedTwitterAccounts.length} Selected Account
                      {selectedTwitterAccounts.length !== 1 ? "s" : ""}
                    </button>
                  </div>
                )}

                {/* Warning for unsaved profiles */}
                {unsavedProfiles && (
                  <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-400">
                    <div className="flex items-start gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mt-0.5 flex-shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="font-medium mb-1">Action required</p>
                        {wise === "customProfiles" &&
                        registeredWise === "customProfiles" ? (
                          <p className="text-sm">
                            You&apos;ve added new profiles but haven&apos;t
                            saved them yet. Click &quot;Update Profiles&quot; to
                            save your changes.
                          </p>
                        ) : (
                          <p className="text-sm">
                            {wise === "categorywise"
                              ? "You've added profiles but you're currently using Category-wise feed. Switch to Profiles feed type and click \"Update Feed Type\" to use these profiles."
                              : "You've added profiles but haven't updated your feed type. Click \"Update Feed Type\" to save your changes."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                {unsavedProfiles && (
                  <div className="p-3 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-400">
                    <div className="flex items-start gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mt-0.5 flex-shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="font-medium mb-1">Unsaved changes</p>
                        <p className="text-sm">
                          {wise === "customProfiles" &&
                          registeredWise === "customProfiles"
                            ? 'Click "Update Profiles" below to save your profile changes.'
                            : 'You need to switch to Profiles feed type and click "Update Feed Type" to use these profiles.'}
                        </p>
                      </div>
                    </div>
                  </div>
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
                      <div
                        ref={dropdownRef}
                        className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-gray-800 bg-black"
                      >
                        <div className="flex justify-between items-center p-2 border-b border-gray-700">
                          <span className="text-sm text-gray-400">
                            Suggestions
                          </span>
                          <button
                            onClick={() => setShowDropdown(false)}
                            className="text-gray-400 hover:text-white"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <ul className="list-none">
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
                            <li className="p-2 text-gray-400">
                              No result found
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {wise === "customProfiles" &&
                  registeredWise === "customProfiles" && (
                    <button
                      className="mt-4 rounded-full bg-black px-24 py-2 text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
                      onClick={handleProfileUpdateFn}
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
                      className={`rounded-full px-6 py-2 text-sm transition-colors ${
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
                  className="mt-4 rounded-full bg-black px-28 py-2 text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
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
                    newlatestNewsletter || "<p>No newsletters available.</p>",
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
