//
//
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
  MoveUp,
  MoveDown,
} from "lucide-react";
import html2canvas from "html2canvas";
import { TutorialOverlay } from "@/components/tutorial-overlay";

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
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalCallback, setModalCallback] = useState<(() => void) | null>(null);

  // Add tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const showModal = (message: string, callback?: () => void) => {
    setModalMessage(message);
    setModalCallback(() => callback || null);
  };
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
  const [newsID, setNewsID] = useState<string | null>(null);
  // Add these new state variables after the existing state declarations
  const [twitterCursor, setTwitterCursor] = useState<string | null>(null);
  const [isLoadingMoreProfiles, setIsLoadingMoreProfiles] = useState(false);
  const [showSettingInfo, setShowSettingInfo] = useState<string | null>(null);
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

  // Add these new state variables after the existing state declarations (around line 100)
  const [sortBy, setSortBy] = useState<"time" | "likes">("time");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterMinLikes, setFilterMinLikes] = useState<number | null>(null);

  // Add these new state variables after the existing sort state declarations
  const [timeFilter, setTimeFilter] = useState<
    "all" | "hour" | "6hours" | "12hours"
  >("all");
  const [engagementFilter, setEngagementFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");
  const [hasMedia, setHasMedia] = useState<"all" | "yes" | "no">("all");

  // Check if this is the user's first login
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    if (!hasSeenTutorial && !pageLoading) {
      setShowTutorial(true);
    }
  }, [pageLoading]);

  // Handle tutorial completion
  const handleTutorialComplete = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setTutorialCompleted(true);
    setShowTutorial(false);
    setSelectedTab("newsfeed"); // Always return to newsfeed tab when tutorial completes
  };

  // Skip tutorial
  const handleSkipTutorial = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setShowTutorial(false);
    setSelectedTab("newsfeed"); // Always return to newsfeed tab when tutorial is skipped
  };

  // Handle tutorial step change
  const handleTutorialStepChange = (step: number) => {
    setTutorialStep(step);

    // Change tabs based on tutorial step
    if (step === 0) {
      // Newsfeed step
      setSelectedTab("newsfeed");
    } else if (step === 1) {
      // Newsletter step
      setSelectedTab("newsletter");
    } else if (step >= 2) {
      // Settings steps
      setSelectedTab("settings");
    }
  };

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

  const handleShareOnX = async () => {
    const newsletterElement = document.getElementById("newsletter-content");

    if (!newsletterElement) {
      showModal("❌ Error capturing newsletter.");
      return;
    }

    try {
      // Clone the newsletter content
      const clone = newsletterElement.cloneNode(true) as HTMLElement;

      // Remove "TOP POSTS OF TODAY" section
      const topPostsIndex = clone.innerHTML.indexOf("TOP POSTS OF TODAY:");
      if (topPostsIndex !== -1) {
        clone.innerHTML = clone.innerHTML.slice(0, topPostsIndex); // Keep only the part before it
      }

      // Ensure text remains white by applying a temporary style
      clone.style.color = "#FFFFFF"; // Force text to be white
      clone.style.backgroundColor = "#000"; // Ensure the background is black

      // Temporarily add the modified element to the document to capture it
      document.body.appendChild(clone);

      // Capture only the modified content
      const originalCanvas = await html2canvas(clone, {
        backgroundColor: "#000", // Ensure background is black
        scale: 2, // High resolution
      });

      // Remove the temporary element
      document.body.removeChild(clone);

      // Create a new canvas with padding
      const paddedCanvas = document.createElement("canvas");
      const padding = 30;
      paddedCanvas.width = originalCanvas.width + padding * 2;
      paddedCanvas.height = originalCanvas.height + padding * 2;
      const ctx = paddedCanvas.getContext("2d");

      if (ctx) {
        // Fill background with black
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);

        // Draw original image with padding
        ctx.drawImage(originalCanvas, padding, padding);

        // Add bold watermark with color #7FFFD4
        const watermarkText = "FeedRecap.com";
        ctx.font = "bold 44px Arial";
        ctx.fillStyle = "#7FFFD4"; // Watermark color
        ctx.textAlign = "right";

        // Add shadow for better visibility
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Draw watermark at the bottom-right
        ctx.fillText(
          watermarkText,
          paddedCanvas.width - 30,
          paddedCanvas.height - 30
        );
      }

      // Convert canvas to Blob
      const blob = await new Promise<Blob>((resolve) =>
        paddedCanvas.toBlob((blob) => resolve(blob!), "image/png")
      );

      // Copy image to clipboard
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);

        showModal("Newsletter copied! Paste newsletter on X", () => {
          const tweetText = encodeURIComponent(
            `Check out today's newsletter on FeedRecap! 🚀\nRead the full newsletter: https://www.feedrecap.com/readnewsletter?newsletter=${newsID}`
          );
          const xAppUrl = `twitter://post?message=${tweetText}`;
          const xWebUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

          const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

          if (isMobile) {
            // Try opening in X app directly
            window.location.href = xAppUrl;

            // If app is not installed, fallback to web after a short delay
            setTimeout(() => {
              window.location.href = xWebUrl;
            }, 500);
          } else {
            // Desktop: Always open in a new tab
            window.open(xWebUrl, "_blank");
          }
        });
      } catch (clipboardError) {
        showModal(
          "Newsletter could not be copied automatically. Please paste it manually."
        );
      }
    } catch (error) {
      console.error("Error sharing newsletter:", error);
      showModal("❌ Failed to share the newsletter.");
    }
  };

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
        setNewsID(userData.latestNewsletterId);

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

  // Unlink Twitter account
  const handleUnlinkTwitter = async () => {
    setIsSavingTwitter(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_SERVER}/unlinkX`, {
        email: emailContext,
      });
      setLinkedTwitter(null);
      showNotification("X account unlinked", "success");
    } catch (err) {
      showNotification("Error unlinking X", "error");
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

  // Add this function after the other handler functions
  const handleResetFilters = () => {
    setSortBy("time");
    setSortOrder("desc");
    setTimeFilter("all");
    setEngagementFilter("all");
    setHasMedia("all");
    setSelectedCategory(null);
    setSelectedProfile(null);
  };

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
        <div className="mb-8 flex items-center justify-center border-b border-gray-800 pb-4">
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
    const fetchAndUpdateAvatar = async () => {
      try {
        const profile = await fetchUserProfile(username);
        // Update the avatar in profiles state
        setProfiles((prev) =>
          prev.map((p) =>
            p.username === username ? { ...p, avatar: profile.avatar } : p
          )
        );
        return profile.avatar;
      } catch (error) {
        console.error("Error fetching avatar:", error);
        return "/placeholder.svg";
      }
    };

    if (!avatar || avatar === "/placeholder.svg") {
      // Fetch profile if avatar is not available
      fetchAndUpdateAvatar();
    }

    if (avatar && avatar !== "/placeholder.svg") {
      return (
        <Image
          src={avatar}
          alt={username}
          width={24}
          height={24}
          className="rounded-full"
          onError={(e) => {
            console.error("Avatar loading error:", username);
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
            // Try to fetch new avatar when current one fails
            fetchAndUpdateAvatar();
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
    const fetchAndUpdateAvatar = async () => {
      try {
        const profile = await fetchUserProfile(username);
        // Update the avatar in profiles state
        setProfiles((prev) =>
          prev.map((p) =>
            p.username === username ? { ...p, avatar: profile.avatar } : p
          )
        );
        return profile.avatar;
      } catch (error) {
        console.error("Error fetching avatar:", error);
        return "/placeholder.svg";
      }
    };

    if (!avatar || avatar === "/placeholder.svg") {
      // Fetch profile if avatar is not available
      fetchAndUpdateAvatar();
    }

    if (avatar && avatar !== "/placeholder.svg") {
      return (
        <Image
          src={avatar}
          alt={username}
          width={40}
          height={40}
          className="rounded-full"
          onError={(e) => {
            console.error("Avatar loading error:", username);
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
            // Try to fetch new avatar when current one fails
            fetchAndUpdateAvatar();
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
              onError={(e) => {
                console.error(
                  "iOS video thumbnail loading error:",
                  post.videoThumbnail
                );
                e.currentTarget.src = "/placeholder.svg";
              }}
              priority={false}
              loading="lazy"
              unoptimized={true}
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
            src={post.mediaThumbnail}
            alt="Tweet media"
            width={500}
            height={240}
            className="object-cover rounded-lg"
            onError={(e) => {
              console.error("Image loading error:", post.mediaThumbnail);
              e.currentTarget.src = "/placeholder.svg";
            }}
            priority={false}
            loading="lazy"
            unoptimized={true}
          />
        </div>
      );
    }

    return null;
  };

  useVideoIntersectionObserver();

  // Add this function to handle showing setting information
  const handleShowSettingInfo = (setting: string) => {
    setShowSettingInfo(setting === showSettingInfo ? null : setting);
  };

  // Replace the handleConnectTwitter function with this enhanced version
  const handleConnectTwitter = async () => {
    if (!twitterUsername) {
      showNotification("Please enter a X username", "error");
      return;
    }

    playSound();
    setIsConnectingTwitter(true);

    try {
      // First, save Twitter username to DB
      await axios.post(`${process.env.NEXT_PUBLIC_SERVER}/saveX`, {
        email: emailContext,
        twitterUsername,
      });

      setLinkedTwitter(twitterUsername);

      // Then fetch followed accounts with pagination
      const allFollowing = await fetchTwitterFollowingWithPagination(
        twitterUsername
      );

      // Save to localStorage for future use
      localStorage.setItem(
        `twitter_following_${twitterUsername}`,
        JSON.stringify(allFollowing)
      );

      setTwitterFollowing(allFollowing);
      setShowTwitterFollowing(true);
      showNotification(`${allFollowing.length} accounts imported`, "success");
    } catch (error) {
      console.error("Error connecting X:", error);
      showNotification("Error connecting to X", "error");
    } finally {
      setIsConnectingTwitter(false);
    }
  };

  // Add this new function to fetch Twitter following with pagination
  const fetchTwitterFollowingWithPagination = async (
    screenname: string,
    maxProfiles = 500
  ): Promise<any[]> => {
    let allFollowing: any[] = [];
    let cursor: string | null = "-1"; // Start with -1 for first page
    let hasMore = true;

    while (hasMore && allFollowing.length < maxProfiles) {
      setIsLoadingMoreProfiles(true);
      try {
        const response: any = await axios.request({
          method: "GET",
          url: "https://twitter-api45.p.rapidapi.com/following.php",
          params: {
            screenname: screenname,
            cursor: cursor,
          },
          headers: {
            "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPID_API_KEY || "",
            "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
          },
        });

        if (response.data && response.data.following) {
          allFollowing = [...allFollowing, ...response.data.following];

          // // Update notification to show progress
          // showNotification(
          //   `Loading profiles: ${allFollowing.length} so far...`,
          //   "success"
          // );

          // Check if there's more data to fetch
          if (response.data.next_cursor && response.data.next_cursor !== "0") {
            cursor = response.data.next_cursor;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error("Error fetching Twitter following page:", error);
        hasMore = false;
      }

      // // Avoid rate limiting
      // if (hasMore) {
      //   await new Promise((resolve) => setTimeout(resolve, 1000));
      // }
    }

    setIsLoadingMoreProfiles(false);
    return allFollowing;
  };

  // Replace the handleShowFollowedProfiles function with this enhanced version
  const handleShowFollowedProfiles = async () => {
    if (!linkedTwitter) return; // Ensure there is a linked account

    playSound();
    setIsConnectingTwitter(true);

    try {
      // First check if we have cached data in localStorage
      const cachedData = localStorage.getItem(
        `twitter_following_${linkedTwitter}`
      );

      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setTwitterFollowing(parsedData);
        setShowTwitterFollowing(true);
        showNotification(
          `Loaded ${parsedData.length} accounts from cache`,
          "success"
        );
        setIsConnectingTwitter(false);
        return;
      }

      // If no cached data, fetch from API with pagination
      const allFollowing = await fetchTwitterFollowingWithPagination(
        linkedTwitter
      );

      // Save to localStorage for future use
      localStorage.setItem(
        `twitter_following_${linkedTwitter}`,
        JSON.stringify(allFollowing)
      );

      setTwitterFollowing(allFollowing);
      setShowTwitterFollowing(true);
      showNotification(`Loaded ${allFollowing.length} accounts`, "success");
    } catch (error) {
      console.error("Error fetching Twitter following:", error);
      showNotification("Error fetching followed profiles", "error");
    } finally {
      setIsConnectingTwitter(false);
    }
  };

  // Add this function to render setting info tooltips
  const renderSettingInfo = (setting: string) => {
    const infoContent = {
      "feed-type":
        'Choose how your feed is organized. "Categories" shows content organized by topics like Tech, Finance, AI etc. "Profiles" shows content from specific accounts you follow',
      "twitter-connect":
        "Connect your X/Twitter account to easily import profiles you already follow. This saves you time from manually adding each profile",
      categories:
        "Select the topics you want to see in your feed. Your feed will prioritize content from these categories",
      "profiles-manage":
        "Add or remove specific accounts to follow. You can search for profiles or import them from your X/Twitter account",
      "time-settings":
        "Choose when you'd like to receive your newsletter: Morning (after 9 AM ET), Afternoon (after 3 PM ET), or Night (after 8 PM ET)",
    };

    if (!showSettingInfo || showSettingInfo !== setting) return null;

    return (
      <div className="mt-2 p-3 bg-[#111] border border-[#7FFFD4] rounded-lg text-white text-sm">
        {infoContent[setting as keyof typeof infoContent]}
      </div>
    );
  };

  const handleSelectTwitterAccount = (screenName: string) => {
    setSelectedTwitterAccounts((prev) =>
      prev.includes(screenName)
        ? prev.filter((name) => name !== screenName)
        : [...prev, screenName]
    );
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

  // Add this function to handle time filtering
  const getTimeFilteredPosts = (posts: Post[]) => {
    const now = new Date().getTime();
    switch (timeFilter) {
      case "hour":
        return posts.filter(
          (post) => now - new Date(post.time).getTime() <= 60 * 60 * 1000
        );
      case "6hours":
        return posts.filter(
          (post) => now - new Date(post.time).getTime() <= 6 * 60 * 60 * 1000
        );
      case "12hours":
        return posts.filter(
          (post) => now - new Date(post.time).getTime() <= 12 * 60 * 60 * 1000
        );
      default:
        return posts;
    }
  };

  // Add this function to handle engagement filtering
  const getEngagementFilteredPosts = (posts: Post[]) => {
    switch (engagementFilter) {
      case "high":
        return posts.filter((post) => post.likes >= 100);
      case "medium":
        return posts.filter((post) => post.likes >= 30 && post.likes < 100);
      case "low":
        return posts.filter((post) => post.likes < 30);
      default:
        return posts;
    }
  };

  // Add this function to handle media filtering
  const getMediaFilteredPosts = (posts: Post[]) => {
    switch (hasMedia) {
      case "yes":
        return posts.filter((post) => post.mediaThumbnail || post.video);
      case "no":
        return posts.filter((post) => !post.mediaThumbnail && !post.video);
      default:
        return posts;
    }
  };

  // Update the filteredPosts definition to include the new filters
  const filteredPosts = getMediaFilteredPosts(
    getEngagementFilteredPosts(
      getTimeFilteredPosts(
        posts.filter(
          (post) =>
            (selectedCategory ? post.category === selectedCategory : true) &&
            (selectedProfile ? post.username === selectedProfile : true)
        )
      )
    )
  ).sort((a, b) => {
    if (sortBy === "time") {
      return sortOrder === "desc"
        ? new Date(b.time).getTime() - new Date(a.time).getTime()
        : new Date(a.time).getTime() - new Date(b.time).getTime();
    } else {
      return sortOrder === "desc" ? b.likes - a.likes : a.likes - b.likes;
    }
  });

  return (
    <div className="min-h-screen bg-black text-white" data-tutorial="dashboard">
      {/* Tutorial Overlay */}
      <TutorialOverlay
        isOpen={showTutorial}
        onClose={handleSkipTutorial}
        onComplete={handleTutorialComplete}
        currentStep={tutorialStep}
        onStepChange={handleTutorialStepChange}
      />

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
                data-tutorial="newsfeed"
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
                data-tutorial="newsletter"
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
                data-tutorial="settings"
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
              <div className="mb-8 mx-1" data-tutorial="trending">
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
                                    onError={(e) => {
                                      console.error(
                                        "Trending image loading error:",
                                        post.mediaThumbnail ||
                                          post.videoThumbnail
                                      );
                                      e.currentTarget.src = "/placeholder.svg";
                                    }}
                                    priority={false}
                                    loading="lazy"
                                    unoptimized={true}
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
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400">No trending posts</p>
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
                    data-tutorial="profiles"
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
              {/* Add this filter UI right after the profiles scrolling section (around line 1400, after the scrollProfiles buttons) */}
              {/* Find the closing </div> after the profilesContainerRef and add this before it: */}
              <div className="flex flex-wrap items-center gap-4 mt-4 mb-4">
                {/* Sort controls */}
                <div className="flex items-center gap-2 bg-[#111] rounded-lg p-2 border border-gray-800">
                  <span className="text-sm text-gray-400">Sort by:</span>
                  <button
                    onClick={() => setSortBy("time")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      sortBy === "time"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    Time
                  </button>
                  <button
                    onClick={() => setSortBy("likes")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      sortBy === "likes"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    Likes
                  </button>
                </div>

                {/* Order controls */}
                <div className="flex items-center gap-2 bg-[#111] rounded-lg p-2.5 border border-gray-800">
                  <span className="text-sm text-gray-400">Order:</span>
                  <button
                    onClick={() => setSortOrder("desc")}
                    className={`px-3 rounded-md text-sm ${
                      sortOrder === "desc"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <MoveDown width={10} />
                  </button>
                  <button
                    onClick={() => setSortOrder("asc")}
                    className={`px-3 rounded-md text-sm ${
                      sortOrder === "asc"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <MoveUp width={10} />
                  </button>
                </div>

                {/* Time filter */}
                <div className="flex items-center gap-2 bg-[#111] rounded-lg p-2 border border-gray-800">
                  <span className="text-sm text-gray-400">Time:</span>
                  <button
                    onClick={() => setTimeFilter("all")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      timeFilter === "all"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTimeFilter("hour")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      timeFilter === "hour"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    1h
                  </button>
                  <button
                    onClick={() => setTimeFilter("6hours")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      timeFilter === "6hours"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    6h
                  </button>
                  <button
                    onClick={() => setTimeFilter("12hours")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      timeFilter === "12hours"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    12h
                  </button>
                </div>

                {/* Engagement filter */}
                <div className="flex items-center gap-2 bg-[#111] rounded-lg p-2 border border-gray-800">
                  <span className="text-sm text-gray-400">Engagement:</span>
                  <button
                    onClick={() => setEngagementFilter("all")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      engagementFilter === "all"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setEngagementFilter("high")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      engagementFilter === "high"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    High
                  </button>
                  <button
                    onClick={() => setEngagementFilter("medium")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      engagementFilter === "medium"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    Med
                  </button>
                  <button
                    onClick={() => setEngagementFilter("low")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      engagementFilter === "low"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    Low
                  </button>
                </div>

                {/* Media filter */}
                <div className="flex items-center gap-2 bg-[#111] rounded-lg p-2 border border-gray-800">
                  <span className="text-sm text-gray-400">Media:</span>
                  <button
                    onClick={() => setHasMedia("all")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      hasMedia === "all"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setHasMedia("yes")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      hasMedia === "yes"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setHasMedia("no")}
                    className={`px-3 py-1 rounded-md text-sm ${
                      hasMedia === "no"
                        ? "bg-[#7FFFD4] text-black"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    No
                  </button>
                </div>

                {/* Reset filters button */}
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-3 rounded-lg text-sm bg-[#7FFFD4] border border-gray-800 text-black hover:bg-gray-800 hover:text-gray-300"
                >
                  Reset Filters
                </button>
              </div>
              <div
                className="sm:masonry-grid columns-1 md:columns-2 lg:columns-3 gap-4"
                data-tutorial="posts"
              >
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
            </div>
          )}

          {selectedTab === "settings" && (
            <div className="settings-content space-y-8 rounded-xl border border-gray-800 bg-[#111] p-6">
              {/* Feed Type Selection */}

              <section className="space-y-4" data-tutorial="feed-type">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#7FFFD4]">
                    Feed Type
                  </h2>
                  <button
                    onClick={() => handleShowSettingInfo("feed-type")}
                    className="text-[#7FFFD4] hover:text-white transition-colors"
                    aria-label="Show feed type information"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  </button>
                </div>
                {renderSettingInfo("feed-type")}
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

              <section
                className="space-y-4 border-t border-gray-800 pt-6"
                data-tutorial="twitter-connect"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#7FFFD4]">
                    Connect X Account
                  </h2>
                  <button
                    onClick={() => handleShowSettingInfo("twitter-connect")}
                    className="text-[#7FFFD4] hover:text-white transition-colors"
                    aria-label="Show Twitter connect information"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  </button>
                </div>
                {renderSettingInfo("twitter-connect")}

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
                        {loading ? "Unlinking..." : "Unlink"}
                      </button>
                      <button
                        className="rounded-lg bg-black px-4 py-2 text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
                        onClick={() => handleShowFollowedProfiles()}
                        disabled={isLoadingMoreProfiles}
                      >
                        {isLoadingMoreProfiles ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                          </>
                        ) : (
                          "Show Followed Profiles"
                        )}
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

                <button
                  onClick={() => handleShowSettingInfo("twitter-connect")}
                  className="text-sm text-gray-400 hover:text-white"
                ></button>

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

                    {isLoadingMoreProfiles && (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#7FFFD4] mr-2"></div>
                        <span className="text-[#7FFFD4]">
                          Loading more profiles...
                        </span>
                      </div>
                    )}

                    <div className="max-h-[300px] overflow-y-auto rounded-lg border border-gray-800 bg-black p-3">
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

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-400">
                        {twitterFollowing.length} accounts loaded
                      </div>
                      <button
                        className="w-full md:w-auto rounded-lg bg-[#7FFFD4] px-4 py-2 text-black transition-colors hover:bg-[#7FFFD4]/90 flex items-center justify-center gap-2"
                        onClick={handleAddSelectedAccounts}
                        disabled={selectedTwitterAccounts.length === 0}
                      >
                        <UserPlus size={16} />
                        Add {selectedTwitterAccounts.length} Selected Account
                        {selectedTwitterAccounts.length !== 1 ? "s" : ""}
                      </button>
                    </div>
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
                data-tutorial="categories"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#7FFFD4]">
                    Update Categories
                  </h2>
                  <button
                    onClick={() => handleShowSettingInfo("categories")}
                    className="text-[#7FFFD4] hover:text-white transition-colors"
                    aria-label="Show categories information"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  </button>
                </div>
                {renderSettingInfo("categories")}
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

                <button
                  onClick={() => handleShowSettingInfo("categories")}
                  className="text-sm text-gray-400 hover:text-white"
                ></button>
              </section>

              {/* Manage Followed Profiles Section */}
              <section
                className={`space-y-4 ${
                  wise === "categorywise" ? "opacity-50" : ""
                }`}
                data-tutorial="profiles-manage"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#7FFFD4]">
                    Manage Followed Profiles
                  </h2>
                  <button
                    onClick={() => handleShowSettingInfo("profiles-manage")}
                    className="text-[#7FFFD4] hover:text-white transition-colors"
                    aria-label="Show profiles management information"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  </button>
                </div>
                {renderSettingInfo("profiles-manage")}
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

                <button
                  onClick={() => handleShowSettingInfo("profiles-manage")}
                  className="text-sm text-gray-400 hover:text-white"
                ></button>
              </section>

              {/* Update Time Section */}
              <section className="space-y-4" data-tutorial="time-settings">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#7FFFD4]">
                    Update Preferred Time
                  </h2>
                  <button
                    onClick={() => handleShowSettingInfo("time-settings")}
                    className="text-[#7FFFD4] hover:text-white transition-colors"
                    aria-label="Show time settings information"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  </button>
                </div>
                {renderSettingInfo("time-settings")}
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

                <button
                  onClick={() => handleShowSettingInfo("time-settings")}
                  className="text-sm text-gray-400 hover:text-white"
                ></button>
              </section>
            </div>
          )}

          {selectedTab === "newsletter" && (
            <div className="space-y-4 rounded-xl border border-gray-800 bg-black p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-[#7FFFD4]">
                  &nbsp;Latest Newsletter
                </h3>
                {latestNewsletter !==
                  "Thank you for signing up. Please wait for your first newsletter to generate" && (
                  <button
                    onClick={handleShareOnX}
                    className="hidden md:flex bg-[#7FFFD4] text-black px-4 py-2 rounded-lg transition hover:bg-[#00CED1]  items-center gap-1"
                  >
                    Share on
                    <XLogo size={14} />
                  </button>
                )}
              </div>

              <div
                id="newsletter-content"
                className="prose prose-invert max-w-none p-4 border border-gray-800 rounded-lg bg-[#111]"
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
              data-tutorial="chat"
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
      {modalMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-[#111] rounded-lg w-full max-w-md mx-auto overflow-hidden shadow-lg">
            <div className="p-6 text-center">
              <p className="text-white text-lg">{modalMessage}</p>
            </div>
            <div className="border-t border-gray-700 p-4 text-center">
              <button
                className="bg-[#7FFFD4] text-black px-6 py-2 rounded-lg transition hover:bg-[#00CED1]"
                onClick={() => {
                  setModalMessage(null);
                  if (modalCallback) modalCallback();
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS for tutorial highlighting */}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 51;
          box-shadow: 0 0 0 4px rgba(127, 255, 212, 0.7);
          border-radius: 4px;
          animation: pulse-border 2s infinite;
          outline: 2px solid #7fffd4;
        }

        @keyframes pulse-border {
          0% {
            box-shadow: 0 0 0 0 rgba(127, 255, 212, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(127, 255, 212, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(127, 255, 212, 0);
          }
        }
      `}</style>
    </div>
  );
}
