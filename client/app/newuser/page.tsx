// "use client";
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import Navbar2 from "@/components/navbar2";
// import Footer2 from "@/components/footer2";
// import CookieConsent from "@/components/cookies";
// import "@/app/newuser/newuser.css";
// import { useRouter } from "next/navigation";
// import toast, { Toaster } from "react-hot-toast";
// import { useEmail } from "@/context/UserContext";

// export default function SelectCategories() {
//   const { emailContext, setEmailContext } = useEmail();
//   console.log("Email is", emailContext);
//   const [categories, setCategories] = useState<string[]>([]);
//   const [times, setTimes] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false); // For loading spinner
//   const router = useRouter(); // Use router for navigation
//   const [timezone, setTimezone] = useState<string | null>(null);

//   const availableCategories = [
//     "Politics",
//     "Geopolitics",
//     "Finance",
//     "AI",
//     "Tech",
//     "Crypto",
//     "Meme",
//     "Sports",
//     "Entertainment",
//   ];
//   const availableTimes = ["Morning", "Afternoon", "Night"];

//   // Detect user's time zone on component mount
//   useEffect(() => {
//     const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
//     setTimezone(userTimezone); // Set user's time zone in state
//   }, []);

//   const handleCategoryChange = (category: string) => {
//     if (categories.includes(category)) {
//       setCategories(categories.filter((c) => c !== category));
//     } else {
//       setCategories([...categories, category]);
//     }
//   };

//   // On component mount, check if email is in localStorage
//   useEffect(() => {
//     const savedEmail = localStorage.getItem("email");
//     if (savedEmail) {
//       setEmailContext(savedEmail);
//     }
//   }, []);

//   useEffect(() => {
//     console.log("email is", emailContext);
//     if (emailContext) {
//       localStorage.setItem("email", emailContext);
//     } else localStorage.removeItem("email");
//   }, [emailContext]);



//   const handleTimeChange = (time: string) => {
//     if (times.includes(time)) {
//       setTimes(times.filter((t) => t !== time));
//     } else {
//       setTimes([...times, time]);
//     }
//   };

//   const handleSubmit = async () => {
//     // Handle submission logic
//     if (categories.length === 0 || times.length === 0) {
//       toast.error("Please select at least one category and one time");
//       return;
//     } else {
//       setLoading(true);

//       try {
//         const response = await axios.post(
//           `${process.env.NEXT_PUBLIC_SERVER}/updateUserPreferences`,
//           {
//             email: emailContext,
//             timezone,
//             categories,
//             time: times,
//           }
//         );
//         if (response.data.code == 0) {
//           toast.success(
//             "You have successfully signed up for FeedRecap, your first summary should be in your inbox shortly"
//           );
//           router.push("/dashboard");
//         } else toast.error("Server error");
//       } catch (err) {
//         toast.error("Server error");
//       }
//     }
//   };

//   return (
//     <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-black mainStart4">
//       <Navbar2 />
//       <Toaster />
//       <div className="mainContainer3 pb-40 mt-28 ">
//         <div className="card bg-base-100 w-120 shadow-xl cardDiv2">
//           {/* Categories Section */}
//           <div className="mt-2">
//             <p className="text-lg tts">
//               Select Categories You Want to Subscribe
//             </p>
//             <div className="flex flex-wrap gap-2 mb-4">
//               {availableCategories.map((category) => (
//                 <button
//                   key={category}
//                   className={`categoryButton ${
//                     categories.includes(category) ? "active" : ""
//                   }`}
//                   onClick={() => handleCategoryChange(category)}
//                 >
//                   {category}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Time Section */}
//           <div className="mt-2">
//             <p className="text-lg tts">
//               Select Times of the Day You Want to Receive a Summary
//             </p>
//             <div className="flex flex-wrap gap-2">
//               {availableTimes.map((time) => (
//                 <button
//                   key={time}
//                   className={`timeButton ${
//                     times.includes(time) ? "active" : ""
//                   }`}
//                   onClick={() => handleTimeChange(time)}
//                 >
//                   {time}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {timezone && (
//             <p className="text-center mt-4">Detected Timezone: {timezone}</p>
//           )}

//           <button className="btn btn-primary mb-4" onClick={handleSubmit}>
//             {loading ? (
//               <span className="loading loading-dots loading-md"></span>
//             ) : (
//               "Continue"
//             )}
//           </button>
//         </div>
//       </div>
//       <Footer2 />
//       <CookieConsent />
//     </div>
//   );
// }


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
  const [categories, setCategories] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [timezone, setTimezone] = useState<string | null>(null);
  const [feedType, setFeedType] = useState<
    "categorywise" | "customProfiles" | null
  >(null);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [newProfile, setNewProfile] = useState("");

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
    setTimezone(userTimezone);
  }, []);

  // Handle profile addition
  const handleAddProfile = () => {
    if (newProfile.trim() === "") {
      toast.error("Profile cannot be empty");
      return;
    }
    if (profiles.length >= 10) {
      toast.error("You can only add up to 10 profiles.");
      return;
    }
    if (profiles.includes(newProfile.trim())) {
      toast.error("Profile already added.");
      return;
    }
    setProfiles((prev) => [...prev, newProfile.trim()]);
    setNewProfile(""); // Clear input
  };

  // Handle profile removal
  const handleRemoveProfile = (profile: string) => {
    setProfiles((prev) => prev.filter((p) => p !== profile));
  };

  const SpinnerWithMessage = () => {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <p className="spinner-message">
          Customizing dashboard. <br />
          <span>Estimated wait time: 30 seconds</span>
        </p>
      </div>
    );
  };


  const handleSubmit = async () => {
    if (!feedType) {
      toast.error("Please select a feed type.");
      return;
    }

    if (
      feedType === "categorywise" &&
      (categories.length === 0 || times.length === 0)
    ) {
      toast.error("Please select at least one category and one time.");
      return;
    }

    if (
      feedType === "customProfiles" &&
      (profiles.length === 0 || times.length === 0)
    ) {
      toast.error("Please add at least one profile and select a time.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateUserPreferences`,
        {
          email: emailContext,
          timezone,
          categories: feedType === "categorywise" ? categories : [],
          profiles: feedType === "customProfiles" ? profiles : [],
          time: times,
          wise: feedType,
        }
      );
      if (response.data.code === 0) {
        toast.success(
          "Preferences saved successfully!"
        );

        setTimeout(() => {
          router.push("/dashboard");
        }, 30000); // 10000ms = 30 seconds
      } else {
        toast.error("Server error.");
      }
    } catch (err) {
      toast.error("Server error.");
    } finally {
      setLoading(false);
    }
  };

  const runDefault = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateUserPreferences`,
        {
          email: emailContext,
          timezone:
            timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          categories: availableCategories,
          profiles: [],
          time: availableTimes,
          wise: "categorywise",
        }
      );
      if (response.data.code === 0) {
        setTimeout(() => {
          router.push("/dashboard");
        }, 30000); // 10000ms = 30 seconds
      } else {
        toast.error("Server error.");
      }
    } catch (err) {
      toast.error("Server error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const executeRunDefault = async () => {
      await runDefault();
    };

    executeRunDefault();
  }, []);


  return (
    <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-black mainStart4">
      <Navbar2 />
      <Toaster />
      {/* {loading ? (
      <SpinnerWithMessage />
    ) : (
      <div className="mainContainer3 pb-40 mt-28">
        <div className="card bg-base-100 w-120 shadow-xl cardDiv2">
          
          <div className="mt-2">
            <p className="text-lg tts">How do you want to receive your feed?</p>
            <div className="flex flex-wrap gap-4">
              <button
                className={`feedTypeButton ${
                  feedType === "categorywise" ? "active" : ""
                }`}
                onClick={() => setFeedType("categorywise")}
              >
                Category-wise
              </button>
              <button
                className={`feedTypeButton ${
                  feedType === "customProfiles" ? "active" : ""
                }`}
                onClick={() => setFeedType("customProfiles")}
              >
                Custom Profiles
              </button>
            </div>
          </div>

          
          {feedType === "categorywise" && (
            <>
              
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
              </div>
            </>
          )}

          {feedType === "customProfiles" && (
            <>
              
              <div className="mt-2">
                <p className="text-lg tts">
                  Add Twitter Profiles You Want to Follow (Max 10)
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {profiles.map((profile) => (
                    <div key={profile} className="profileTag">
                      @{profile}
                      <button
                        className="removeProfileButton"
                        onClick={() => handleRemoveProfile(profile)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newProfile}
                    onChange={(e) => setNewProfile(e.target.value)}
                    placeholder="@username"
                    className="profileInput"
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleAddProfile}
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

         
          {feedType && (
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
                    onClick={() =>
                      setTimes((prev) =>
                        prev.includes(time)
                          ? prev.filter((t) => t !== time)
                          : [...prev, time]
                      )
                    }
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

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
      )} */}
      <SpinnerWithMessage/>
      <Footer2 />
      <CookieConsent />
    </div>
  );
}
