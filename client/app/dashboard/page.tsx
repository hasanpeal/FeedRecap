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
import _ from "lodash";
import Navbar3 from "@/components/navbar3";
import { TutorialOverlay } from "@/components/tutorial-overlay";

// Import components
import { SkeletonLoader } from "@/components/dashboard/SkeletonLoader";
import { NewsfeedContent } from "@/components/dashboard/NewsfeedContent";
import { NewsletterSection } from "@/components/dashboard/NewsletterSection";
import { SettingsSection } from "@/components/dashboard/SettingsSection";
import { ChatModal, ChatButton } from "@/components/dashboard/ChatModal";
import { Modal } from "@/components/dashboard/Modal";
import { Notification } from "@/components/dashboard/Notification";
import html2canvas from "html2canvas";
// Import types and utilities
import {
  Post,
  UserProfile,
  ChatMessage,
  Notification as NotificationType,
  FeedType,
  SortBy,
  SortOrder,
  TwitterAccount,
} from "@/components/dashboard/types";
import { playSound, isIOS } from "@/components/dashboard/utils";

export default function Dashboard() {
  const { emailContext, setEmailContext } = useEmail();

  // Modal state
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalCallback, setModalCallback] = useState<(() => void) | null>(null);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Main data state
  const [categories, setCategories] = useState<string[]>([]);
  const [time, setTime] = useState<string[]>([]);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [dbTimezone, setDbTimezone] = useState<string | null>(null);
  const [latestNewsletter, setLatestNewsletter] = useState<string | null>(null);
  const [newlatestNewsletter, setNewLatestNewsletter] = useState<string | null>(
    null
  );
  const [newsID, setNewsID] = useState<string | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState<boolean>(true);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [updatingFeed, setUpdatingFeed] = useState(false);

  // Posts and profiles
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  // UI state
  const [selectedTab, setSelectedTab] = useState("newsfeed");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<{
    [key: string]: boolean;
  }>({});

  // Feed type and sorting
  const [wise, setWise] = useState<FeedType>("categorywise");
  const [registeredWise, setRegisteredWise] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("time");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Profile management
  const [newProfile, setNewProfile] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [cache, setCache] = useState<{ [key: string]: string[] }>({});
  const [unsavedProfiles, setUnsavedProfiles] = useState<boolean>(false);

  // Twitter username suggestions
  const [twitterSuggestions, setTwitterSuggestions] = useState<string[]>([]);
  const [showTwitterSuggestions, setShowTwitterSuggestions] =
    useState<boolean>(false);
  const [loadingTwitterSuggestions, setLoadingTwitterSuggestions] =
    useState<boolean>(false);

  // Twitter integration
  const [twitterUsername, setTwitterUsername] = useState("");
  const [isConnectingTwitter, setIsConnectingTwitter] = useState(false);
  const [twitterFollowing, setTwitterFollowing] = useState<TwitterAccount[]>(
    []
  );
  const [selectedTwitterAccounts, setSelectedTwitterAccounts] = useState<
    string[]
  >([]);
  const [showTwitterFollowing, setShowTwitterFollowing] = useState(false);
  const [isSavingTwitter, setIsSavingTwitter] = useState(false);
  const [showTwitterDropdown, setShowTwitterDropdown] =
    useState<boolean>(false);
  const [linkedTwitter, setLinkedTwitter] = useState<string | null>(null);
  const [isLoadingMoreProfiles, setIsLoadingMoreProfiles] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Settings info
  const [showSettingInfo, setShowSettingInfo] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<NotificationType | null>(
    null
  );

  // Refs
  const profilesContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const twitterDropdownRef = useRef<HTMLDivElement>(null);
  const twitterSuggestionsRef = useRef<HTMLDivElement>(null);

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
    setSelectedTab("newsfeed");
  };

  // Skip tutorial
  const handleSkipTutorial = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setShowTutorial(false);
    setSelectedTab("newsfeed");
  };

  // Handle tutorial step change
  const handleTutorialStepChange = (step: number) => {
    setTutorialStep(step);
    if (step === 0) {
      setSelectedTab("newsfeed");
    } else if (step === 1) {
      setSelectedTab("newsletter");
    } else if (step >= 2) {
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

  // Click outside handlers
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        twitterSuggestionsRef.current &&
        !twitterSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowTwitterSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Video intersection observer
  useEffect(() => {
    if (isIOS()) return;
    const videoElements = document.querySelectorAll(".post-video");
    if (!videoElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (!entry.isIntersecting && !video.paused) {
            video.pause();
          }
        });
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.2,
      }
    );

    videoElements.forEach((video) => observer.observe(video));
    return () => videoElements.forEach((video) => observer.unobserve(video));
  }, [posts]);

  // Chat scroll effect
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, []);

  const showModal = (message: string, callback?: () => void) => {
    setModalMessage(message);
    setModalCallback(() => callback || null);
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // API functions
  const fetchUserProfile = async (username: string): Promise<UserProfile> => {
    let retries = 0;
    const maxRetries = 7;

    while (retries < maxRetries) {
      try {
        const response = await axios.get(`/api/twitter`, {
          params: {
            endpoint: "screenname.php",
            screenname: username,
          },
        });

        if (response.data && response.data.avatar) {
          return { username, avatar: response.data.avatar };
        }
        throw new Error("No avatar in response");
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          return { username, avatar: "/placeholder.svg" };
        }
      }
    }
    return { username, avatar: "/placeholder.svg" };
  };

  const fetchSuggestions = async (keyword: string): Promise<string[]> => {
    try {
      const response = await axios.get(`/api/twitter`, {
        params: {
          endpoint: "search.php",
          query: keyword,
          searchType: "People",
        },
      });

      if (response.data && response.data.timeline) {
        return response.data.timeline
          .filter((item: any) => item.screen_name)
          .slice(0, 4)
          .map((item: any) => item.screen_name);
      } else {
        console.warn("No suggestions found for keyword:", keyword);
        return [];
      }
    } catch (err) {
      return [];
    }
  };

  const fetchTwitterFollowingWithPagination = async (
    screenname: string,
    maxProfiles = 500
  ): Promise<TwitterAccount[]> => {
    let allFollowing: TwitterAccount[] = [];
    let cursor: string | null = "-1";
    let hasMore = true;

    while (hasMore && allFollowing.length < maxProfiles) {
      setIsLoadingMoreProfiles(true);
      try {
        const response: {
          data: { following: TwitterAccount[]; next_cursor: string };
        } = await axios.get(`/api/twitter`, {
          params: {
            endpoint: "following.php",
            screenname: screenname,
            cursor: cursor,
          },
        });

        if (response.data && response.data.following) {
          allFollowing = [...allFollowing, ...response.data.following];

          if (response.data.next_cursor && response.data.next_cursor !== "0") {
            cursor = response.data.next_cursor;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        hasMore = false;
      }
    }

    setIsLoadingMoreProfiles(false);
    return allFollowing;
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

      if (response.status === 200) {
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

        setProfiles(
          userData.profiles.map((profile: string) => {
            const matchedPost = response.data.posts.find(
              (post: { username: string }) => post.username === profile
            );
            return {
              username: profile,
              avatar: matchedPost?.avatar || "/placeholder.svg",
            };
          })
        );

        const sortedPosts = response.data.posts.sort(
          (a: Post, b: Post) =>
            new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        setPosts(sortedPosts);
      } else {
        showNotification("Error loading data.", "error");
      }
    } catch (err) {
      showNotification("Error fetching data.", "error");
    } finally {
      setLoadingProfiles(false);
      setLoadingPosts(false);
      setPageLoading(false);
    }
  };

  // Event handlers
  const handleShareOnX = async () => {
    const newsletterElement = document.getElementById("newsletter-content");
    if (!newsletterElement) {
      showModal("❌ Error capturing newsletter.");
      return;
    }

    try {
      const clone = newsletterElement.cloneNode(true) as HTMLElement;
      const topPostsIndex = clone.innerHTML.indexOf("TOP POSTS OF TODAY:");
      if (topPostsIndex !== -1) {
        clone.innerHTML = clone.innerHTML.slice(0, topPostsIndex);
      }

      clone.style.color = "#FFFFFF";
      clone.style.backgroundColor = "#000";
      document.body.appendChild(clone);

      const originalCanvas = await html2canvas(clone, {
        backgroundColor: "#000",
        scale: 2,
      });

      document.body.removeChild(clone);

      const paddedCanvas = document.createElement("canvas");
      const padding = 30;
      paddedCanvas.width = originalCanvas.width + padding * 2;
      paddedCanvas.height = originalCanvas.height + padding * 2;
      const ctx = paddedCanvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
        ctx.drawImage(originalCanvas, padding, padding);

        const watermarkText = "FeedRecap.com";
        ctx.font = "bold 44px Arial";
        ctx.fillStyle = "#7FFFD4";
        ctx.textAlign = "right";
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(
          watermarkText,
          paddedCanvas.width - 30,
          paddedCanvas.height - 30
        );
      }

      const blob = await new Promise<Blob>((resolve) =>
        paddedCanvas.toBlob((blob) => resolve(blob!), "image/png")
      );

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
            window.location.href = xAppUrl;
            setTimeout(() => {
              window.location.href = xWebUrl;
            }, 500);
          } else {
            window.open(xWebUrl, "_blank");
          }
        });
      } catch (clipboardError) {
        showModal(
          "Newsletter could not be copied automatically. Please paste it manually."
        );
      }
    } catch (error) {
      showModal("❌ Failed to share the newsletter.");
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
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
      setShowDropdown(true);
    }, 300),
    [cache]
  );

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
        setTwitterSuggestions([]);
      } finally {
        setLoadingTwitterSuggestions(false);
      }
      setShowTwitterSuggestions(true);
    }, 300),
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

  const handleTwitterUsernameChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.target.value;
    const cleanedInput = input.startsWith("@") ? input.substring(1) : input;
    setTwitterUsername(cleanedInput);

    // Trigger suggestions for Twitter username
    setLoadingTwitterSuggestions(true);
    if (cleanedInput.trim().length > 0) {
      debouncedTwitterSearch(cleanedInput);
    } else {
      setTwitterSuggestions([]);
      setShowTwitterSuggestions(false);
      setLoadingTwitterSuggestions(false);
    }
  };

  const handleAddProfile = async (suggestion: string) => {
    playSound();
    if (profiles.some((profile) => profile.username === suggestion)) {
      showNotification("Profile already added.", "error");
      return;
    }

    const tempProfile = { username: suggestion, avatar: "/placeholder.svg" };
    setProfiles((prev) => [...prev, tempProfile]);
    setNewProfile("");
    setShowDropdown(false);

    try {
      const newProfile = await fetchUserProfile(suggestion);
      setProfiles((prev) =>
        prev.map((p) => (p.username === suggestion ? newProfile : p))
      );
    } catch (error) {
      showNotification("Error adding profile.", "error");
    }
  };

  const handleProfileUpdateFn = async () => {
    playSound();
    setSelectedTab("newsfeed");
    setSelectedProfile(null);
    setUpdatingFeed(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateProfiles`,
        {
          email: emailContext,
          profiles: profiles.map((p) => p.username),
        }
      );
      if (response.status === 200) {
        fetchData();
        showNotification("Profiles updated successfully!", "success");
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
      if (response.status === 200) {
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
      if (response.status === 200) {
        showNotification("Times Updated", "success");
      } else showNotification("Server Error", "error");
    } catch (err) {
      showNotification("Server Error", "error");
    }
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

      if (response.status === 200) {
        setRegisteredWise(wise);
        await fetchData();
        showNotification("Feed type updated successfully!", "success");
        setUnsavedProfiles(false);
      } else {
        showNotification("Error updating feed type.", "error");
      }
    } catch (err) {
      showNotification("Error updating feed type.", "error");
    } finally {
      setUpdatingFeed(false);
      setLoading(false);
    }
  };

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

  const handleConnectTwitter = async () => {
    if (!twitterUsername) {
      showNotification("Please enter a X username", "error");
      return;
    }

    playSound();
    setIsConnectingTwitter(true);

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_SERVER}/saveX`, {
        email: emailContext,
        twitterUsername,
      });

      setLinkedTwitter(twitterUsername);
      const allFollowing = await fetchTwitterFollowingWithPagination(
        twitterUsername
      );
      localStorage.setItem(
        `twitter_following_${twitterUsername}`,
        JSON.stringify(allFollowing)
      );
      setTwitterFollowing(allFollowing);
      setShowTwitterFollowing(true);
      showNotification(`${allFollowing.length} accounts imported`, "success");
    } catch (error) {
      showNotification("Error connecting to X", "error");
    } finally {
      setIsConnectingTwitter(false);
    }
  };

  const handleShowFollowedProfiles = async () => {
    if (!linkedTwitter) return;

    playSound();
    setIsConnectingTwitter(true);

    try {
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

      const allFollowing = await fetchTwitterFollowingWithPagination(
        linkedTwitter
      );
      localStorage.setItem(
        `twitter_following_${linkedTwitter}`,
        JSON.stringify(allFollowing)
      );
      setTwitterFollowing(allFollowing);
      setShowTwitterFollowing(true);
      showNotification(`Loaded ${allFollowing.length} accounts`, "success");
    } catch (error) {
      showNotification("Error fetching followed profiles", "error");
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

  const handleAddSelectedAccounts = async () => {
    if (selectedTwitterAccounts.length === 0) {
      showNotification("Please select at least one account", "error");
      return;
    }

    playSound();
    setLoading(true);

    const currentProfiles = [...profiles];

    for (const screenName of selectedTwitterAccounts) {
      if (!profiles.some((profile) => profile.username === screenName)) {
        try {
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
          showNotification("Error adding profile.", "error");
        }
      }
    }

    setProfiles(currentProfiles);
    setUnsavedProfiles(true);
    setShowTwitterFollowing(false);
    setSelectedTwitterAccounts([]);
    showNotification("Accounts added to your profiles", "success");
    setLoading(false);
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
      aiResponse = aiResponse.replace(/\*/g, "");
      aiResponse = aiResponse.replace(/\[|\]/g, "");
      aiResponse = aiResponse.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");
      aiResponse = aiResponse.replace(/`([^`]+)`/g, "$1");

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse },
      ]);
      playSound();
    } catch (error) {
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

  const togglePostExpansion = (tweetId: string) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [tweetId]: !prev[tweetId],
    }));
  };

  const scrollProfiles = (direction: "left" | "right") => {
    if (profilesContainerRef.current) {
      const scrollAmount = 200;
      profilesContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

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
        <div className="container mx-auto px-4 py-4 pb-16">
          <Notification notification={notification} />

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
            <NewsfeedContent
              posts={posts}
              loadingPosts={loadingPosts}
              wise={wise}
              categories={categories}
              profiles={profiles}
              selectedCategory={selectedCategory}
              selectedProfile={selectedProfile}
              sortBy={sortBy}
              sortOrder={sortOrder}
              expandedPosts={expandedPosts}
              onCategorySelect={setSelectedCategory}
              onProfileSelect={setSelectedProfile}
              onSortByChange={setSortBy}
              onSortOrderChange={setSortOrder}
              onToggleExpansion={togglePostExpansion}
              profilesContainerRef={profilesContainerRef}
              scrollProfiles={scrollProfiles}
            />
          )}

          {selectedTab === "settings" && (
            <SettingsSection
              wise={wise}
              setWise={setWise}
              categories={categories}
              setCategories={setCategories}
              profiles={profiles}
              setProfiles={setProfiles}
              time={time}
              setTime={setTime}
              linkedTwitter={linkedTwitter}
              twitterUsername={twitterUsername}
              setTwitterUsername={setTwitterUsername}
              twitterFollowing={twitterFollowing}
              selectedTwitterAccounts={selectedTwitterAccounts}
              setSelectedTwitterAccounts={setSelectedTwitterAccounts}
              showTwitterFollowing={showTwitterFollowing}
              setShowTwitterFollowing={setShowTwitterFollowing}
              unsavedProfiles={unsavedProfiles}
              registeredWise={registeredWise}
              loading={loading}
              isConnectingTwitter={isConnectingTwitter}
              isLoadingMoreProfiles={isLoadingMoreProfiles}
              isSavingTwitter={isSavingTwitter}
              showSettingInfo={showSettingInfo}
              setShowSettingInfo={setShowSettingInfo}
              onFeedTypeUpdate={handleFeedTypeUpdateFn}
              onCategoryUpdate={handleCategoryUpdate}
              onProfileUpdate={handleProfileUpdateFn}
              onTimeUpdate={handleTimeUpdate}
              onConnectTwitter={handleConnectTwitter}
              onUnlinkTwitter={handleUnlinkTwitter}
              onShowFollowedProfiles={handleShowFollowedProfiles}
              onAddSelectedAccounts={handleAddSelectedAccounts}
              onSelectTwitterAccount={handleSelectTwitterAccount}
              onAddProfile={handleAddProfile}
              onRemoveProfile={(username) =>
                setProfiles((prev) =>
                  prev.filter((p) => p.username !== username)
                )
              }
              onSearchInputChange={handleSearchInputChange}
              onTwitterUsernameChange={handleTwitterUsernameChange}
              newProfile={newProfile}
              suggestions={suggestions}
              showDropdown={showDropdown}
              setShowDropdown={setShowDropdown}
              loadingSuggestions={loadingSuggestions}
              dropdownRef={dropdownRef}
              twitterDropdownRef={twitterDropdownRef}
              // Twitter suggestions
              twitterSuggestions={twitterSuggestions}
              showTwitterSuggestions={showTwitterSuggestions}
              setShowTwitterSuggestions={setShowTwitterSuggestions}
              loadingTwitterSuggestions={loadingTwitterSuggestions}
              twitterSuggestionsRef={twitterSuggestionsRef}
            />
          )}

          {selectedTab === "newsletter" && (
            <NewsletterSection
              latestNewsletter={latestNewsletter}
              newlatestNewsletter={newlatestNewsletter}
              newsID={newsID}
              onShareOnX={handleShareOnX}
            />
          )}

          {/* Floating Chat Button */}
          {wise === "customProfiles" && (
            <ChatButton onClick={() => setIsChatOpen(true)} />
          )}

          {/* Chat Modal */}
          <ChatModal
            isChatOpen={isChatOpen}
            chatMessages={chatMessages}
            userInput={userInput}
            isTyping={isTyping}
            onClose={() => setIsChatOpen(false)}
            onInputChange={setUserInput}
            onSendMessage={handleSendMessage}
            onResetChat={resetChat}
            chatContainerRef={chatContainerRef}
          />
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={!!modalMessage}
        message={modalMessage || ""}
        onClose={() => setModalMessage(null)}
        onConfirm={modalCallback || undefined}
      />

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
