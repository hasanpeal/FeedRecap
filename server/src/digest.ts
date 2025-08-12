import axios from "axios";
import mongoose from "mongoose";
import sgMail from "@sendgrid/mail";
import cron from "node-cron";
import moment from "moment-timezone";
import { User, IUser } from "./userModel";
import { marked } from "marked";
import { Newsletter } from "./newsletterModel";
import OpenAI from "openai";
import { StoredTweets, CustomProfilePosts } from "./tweetModel";

// Set up SendGrid API
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");
const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "",
  apiKey: process.env.OPENAI,
});

const NUM_PARALLEL = 5;


function extractQuotedTweet(quoted: any): any | null {
  if (!quoted || !quoted.tweet_id) return null;

  return {
    tweet_id: quoted.tweet_id,
    text: removeLinksFromText(quoted.text) || null,
    likes: quoted.favorites || null,
    createdAt: quoted.created_at
      ? moment(quoted.created_at, "ddd MMM DD HH:mm:ss Z YYYY").toDate()
      : null,
    mediaThumbnail: extractMediaThumbnail(quoted),
    video: extractVideoUrl(quoted),
    videoThumbnail: extractVideoThumbnail(quoted),
    screenName: quoted.author?.screen_name,
    avatar: quoted.author?.avatar || null,
  };
}

// Thumbnail extract
function extractMediaThumbnail(tweet: any): string | null {
  if (tweet.media && tweet.media.photo && tweet.media.photo.length > 0) {
    return tweet.media.photo[0].media_url_https; // ✅ Get the first photo
  }
  return null; // No image found
}

function extractVideoUrl(tweet: any): string | null {
  if (tweet.media && tweet.media.video && tweet.media.video.length > 0) {
    const videoVariants = tweet.media.video[0].variants;
    if (videoVariants.length > 1) {
      return videoVariants[1].url; // ✅ Get the second variant (1-indexed)
    }
    return videoVariants[0].url; // ✅ Fallback to the first variant if only one exists
  }
  return null; // No video found
}

function extractVideoThumbnail(tweet: any): string | null {
  if (tweet.media && tweet.media.video && tweet.media.video.length > 0) {
    return tweet.media.video[0].media_url_https; // ✅ Get video thumbnail
  }
  return null; // No video thumbnail found
}

const fetchAvatar = async (username: string): Promise<string | null> => {
  let retries = 0;
  const maxRetries = 7;

  while (retries < maxRetries) {
    try {
      const response = await axios.get(
        `https://${process.env.TWITTER_API_HOST}/screenname.php`,
        {
          params: { screenname: username },
          headers: {
            "x-rapidapi-key": process.env.TWITTER_API_KEY,
            "x-rapidapi-host": process.env.TWITTER_API_HOST,
          },
        }
      );

      // If we successfully get an avatar, return immediately
      if (response.data?.avatar) {
        return response.data.avatar;
      }
    } catch (error) {
      console.error(
        `Error fetching avatar for ${username} (Attempt ${retries + 1}):`,
        error
      );
      retries++;
    }
  }

  return null; // Return null if all retries fail
};

// Fetch and store tweets for specified categories
export async function fetchAndStoreTweets(categories: string[]): Promise<void> {
  const categoryAccounts: { [key: string]: string[] } = {
    Politics: ["Politico", "Shellenberger", "Axios", "TheChiefNerd"],
    Geopolitics: ["Faytuks", "sentdefender", "Global_Mil_Info"],
    Finance: ["financialjuice", "ForexLive", "DeItaone", "WSJ"],
    AI: ["pmddomingos", "AndrewYNg", "tegmark", "OpenAI"],
    Tech: ["ycombinator", "jason", "elonmusk"],
    Crypto: ["VitalikButerin", "pierre_crypt0", "APompliano", "ErikVoorhees"],
    Meme: ["stoolpresidente", "litcapital", "trustfundterry", "TheoVon"],
    Sports: ["SportsCenter", "WojESPN", "BleacherReport", "TheAthletic"],
    Entertainment: ["IMDb", "Netflix", "TheAVClub", "LightsCameraPod"],
  };

  for (const category of categories) {
    const screenNames = categoryAccounts[category];
    if (!screenNames) {
      continue;
    }

    for (const screenName of screenNames) {
      try {
        // Make the API call to fetch tweets
        const response = await axios.get(
          `https://${process.env.TWITTER_API_HOST}/timeline.php`,
          {
            params: { screenname: screenName },
            headers: {
              "x-rapidapi-key": process.env.TWITTER_API_KEY,
              "x-rapidapi-host": process.env.TWITTER_API_HOST,
            },
          }
        );

        // Process tweets: Sort by likes and get the top 15
        const now = moment();
        const past24Hours = now.subtract(24, "hours");

        const tweets = response.data.timeline;

        // Filter only the tweets posted within the last 24 hours
        const recentTweets = tweets.filter((tweet: any) => {
          const tweetTime = moment(
            tweet.created_at,
            "ddd MMM DD HH:mm:ss Z YYYY"
          );
          return tweetTime.isAfter(past24Hours);
        });

        const topTweets = recentTweets
          .sort((a: any, b: any) => b.favorites - a.favorites)
          .slice(0, 25) // Was 10 before
          .map((tweet: any) => ({
            text: removeLinksFromText(tweet.text),
            likes: tweet.favorites, // Accessing the 'favorites' field for likes
            tweet_id: tweet.tweet_id,
            createdAt: moment(
              tweet.created_at,
              "ddd MMM DD HH:mm:ss Z YYYY"
            ).toDate(), // Use tweet creation time
            mediaThumbnail: extractMediaThumbnail(tweet),
            screenName: screenName,
            video: extractVideoUrl(tweet),
            videoThumbnail: extractVideoThumbnail(tweet),
            quotedTweet: extractQuotedTweet(tweet.quoted),
          }));

        // Fetch avatar (only if it's missing in DB)
        let storedUser = await StoredTweets.findOne({
          category,
          screenName,
        }).select("avatar");
        let avatar = storedUser?.avatar || (await fetchAvatar(screenName));

        // Store the tweets in MongoDB
        await StoredTweets.findOneAndUpdate(
          { category, screenName },
          { tweets: topTweets, avatar, createdAt: new Date() },
          { upsert: true }
        );
      } catch (err: any) {
        console.error(
          `❌ [Error]: Error fetching tweets for ${screenName}:`,
          err.message
        );
        continue; // Skip to the next screen name without crashing
      }
    }
  }
}

// DEEPSEEK API:
export async function generateNewsletter(
  tweetsByCategory: {
    category: string;
    tweetsByUser: { screenName: string; tweets: string[] }[];
  }[],
  top15Tweets: {
    screenName: string;
    category: string;
    tweet: string;
    likes: number;
    tweet_id: string;
  }[]
): Promise<string | undefined> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: process.env.CATEGORY_NEWSLETTER_PROMPT || "",
      },
      {
        role: "user",
        content:
          "Here is the tweet data you are summarizing:\n\n" +
          tweetsByCategory
            .map(({ category, tweetsByUser }) => {
              return (
                `Category: ${category}\n` +
                tweetsByUser
                  .map(
                    ({ screenName, tweets }) =>
                      `Tweets by @${screenName}:\n${tweets.join("\n")}\n\n`
                  )
                  .join("")
              );
            })
            .join(""),
      },
    ];

    const response = await openai.chat.completions.create({
      messages,
      model: process.env.OPENAI_MODEL || "",
    });

    let result = response.choices[0].message.content;

    // Manually append the top 15 tweets to the end of the newsletter
    const topTweetsText = top15Tweets
      .map(
        (tweet, index) =>
          `${index + 1}. ${tweet.tweet.replace(/\n/g, " ")} @${
            tweet.screenName
          } <a href="https://x.com/${tweet.screenName}/status/${
            tweet.tweet_id
          }"> <em>View Post</em> </a>`
      )
      .join("\n\n");

    // Append the top 15 tweets to the generated newsletter
    const finalNewsletterContent = `${result}\n\n**TOP POSTS OF TODAY:**\n${topTweetsText}`;

    // Convert the newsletter to HTML using `marked`
    const newsletterHTML = marked(finalNewsletterContent);

    return newsletterHTML;
  } catch (error) {
    console.error("❌ [Error]: Error generating newsletter:", error);
    return undefined;
  }
}

function removeLinksFromText(text: string): string {
  return text.replace(/https?:\/\/\S+/g, "").trim(); // Removes all links starting with http/https
}

// Function to calculate top 15 tweets from different users, ensuring diversity
export async function fetchTweetsForCategories(
  categories: string[]
): Promise<{ tweetsByCategory: any[]; top15Tweets: any[] }> {
  const tweetsByCategory: {
    category: string;
    tweetsByUser: { screenName: string; tweets: string[] }[];
  }[] = [];
  const allTweetsWithLikes: {
    screenName: string;
    category: string;
    tweet: string;
    likes: number;
    tweet_id: string;
  }[] = [];

  // Fetch stored tweets from the database by category
  for (const category of categories) {
    const storedTweets = await StoredTweets.find({ category }).exec();

    if (storedTweets.length) {
      const tweetsByUser = storedTweets.map((tweetRecord) => ({
        screenName: tweetRecord.screenName,
        tweets: tweetRecord.tweets.map((tweet) => tweet.text),
      }));
      tweetsByCategory.push({ category, tweetsByUser });

      // Store tweets with likes for the Top 15 calculation
      storedTweets.forEach((tweetRecord) => {
        tweetRecord.tweets.forEach((tweet) => {
          allTweetsWithLikes.push({
            screenName: tweetRecord.screenName,
            category: tweetRecord.category,
            tweet: tweet.text.slice(0, 300),
            likes: tweet.likes,
            tweet_id: tweet.tweet_id, // Ensure tweet_id is included
          });
        });
      });
    }
  }

  // Sort all tweets by likes, and then group them by users to ensure diversity
  const groupedByUser: {
    [screenName: string]: {
      screenName: string;
      category: string;
      tweet: string;
      likes: number;
      tweet_id: string;
    }[];
  } = {};

  // Group tweets by user to ensure no one user dominates the top tweets
  allTweetsWithLikes.forEach((tweetData) => {
    if (!groupedByUser[tweetData.screenName]) {
      groupedByUser[tweetData.screenName] = [];
    }
    groupedByUser[tweetData.screenName].push(tweetData);
  });

  // Now prioritize getting top tweet from different users and categories
  const uniqueTop15Tweets: {
    screenName: string;
    category: string;
    tweet: string;
    likes: number;
    tweet_id: string;
  }[] = [];

  // Gather one top tweet from each user and category, ensuring diversity
  Object.keys(groupedByUser).forEach((screenName) => {
    const userTweets = groupedByUser[screenName];
    if (userTweets.length) {
      // Sort the user's tweets by likes
      const topTweet = userTweets.sort((a, b) => b.likes - a.likes)[0];
      if (uniqueTop15Tweets.length < 15) {
        uniqueTop15Tweets.push({
          screenName: topTweet.screenName,
          category: topTweet.category,
          tweet: topTweet.tweet,
          likes: topTweet.likes,
          tweet_id: topTweet.tweet_id,
        });
      }
    }
  });

  // If we still have less than 15 tweets, we fill the remaining spots with the most liked tweets overall
  if (uniqueTop15Tweets.length < 15) {
    const remainingTweets = allTweetsWithLikes
      .sort((a, b) => b.likes - a.likes) // Sort by likes descending
      .filter(
        (tweet) =>
          !uniqueTop15Tweets.some(
            (topTweet) => topTweet.screenName === tweet.screenName
          )
      ) // Filter out any tweets from users we've already picked from
      .slice(0, 15 - uniqueTop15Tweets.length);

    uniqueTop15Tweets.push(...remainingTweets);
  }

  return { tweetsByCategory, top15Tweets: uniqueTop15Tweets };
}

// Helper function to convert HTML to plain text
function convertHtmlToPlainText(html: string): string {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || "";
}

export async function sendNewsletterEmail(
  user: IUser,
  newsletter: string
): Promise<void> {
  // Save the newsletter
  const newNewsletter = new Newsletter({
    user: user._id,
    content: newsletter,
  });
  const savedNewsletter = await newNewsletter.save();

  // Short link for the newsletter
  const shortLink = `${process.env.ORIGIN}/readnewsletter?newsletter=${savedNewsletter._id}`;
  // Construct Share on X URL
  const shareText = encodeURIComponent(
    `📢 Read today's newsletter at FeedRecap! 🚀\n\n${shortLink}`
  );
  const shareOnXLink = `https://twitter.com/intent/tweet?text=${shareText}`;

  // X Mobile Deep Link (opens in X app if installed)
  const shareOnXMobile = `twitter://post?message=${shareText}`;
  // Unsubscribe link
  const unsubscribeLink = `${
    process.env.ORIGIN
  }/unsubscribe?email=${encodeURIComponent(user.email)}`;

  const emailTemplate = `
<div style="color: #333; font-family: Verdana, sans-serif; margin: auto; border-radius: 12px; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);">      
      <!-- Newsletter Content -->
      <div style="background: white; border-radius: 10px; margin-top: 20px; font-size: 16px; line-height: 1.6; color: #333; box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.05);">
        ${newsletter}
      </div>

      <!-- Call to Action -->
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #666;">Share it with your friends 📲</p>
        <a href="${shortLink}" 
          style="background: #00A8E8; color: #000; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 10px; transition: all 0.3s ease-in-out;">
          📩 Read & Share
        </a>
      </div>

      <!-- Share on X -->
  <div style="text-align: center; margin-top: 20px;">
    <p style="color: #666;">🚀 Spread the word on X</p>
    <a href="${shareOnXLink}" 
      onclick="event.preventDefault(); if(navigator.userAgent.match(/(iPhone|iPod|iPad|Android)/i)){ window.location.href='${shareOnXMobile}'; setTimeout(() => { window.location.href='${shareOnXLink}'; }, 1000); } else { window.location.href='${shareOnXLink}'; }"
      style="background: #00A8E8; color: #000; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 10px; transition: all 0.3s ease-in-out;">
      Share on X
    </a>
  </div>

      <!-- Divider -->
      <hr style="margin: 30px 0; border: 0.5px solid #DDD;">

      <!-- Unsubscribe -->
      <div style="text-align: center; font-size: 14px; color: #777; margin-top: 20px;">
        <p><a href="${unsubscribeLink}" style="color: #00A8E8; text-decoration: none;">Click here to unsubscribe</a></p>
      </div>

      <!-- Social Media Footer -->
      <div style="text-align: center; font-size: 14px; color: #777; margin-top: 20px;">
        <p>Stay updated on</p>
        <a href="https://x.com/FeedRecap" style="color: #00A8E8; text-decoration: none; margin: 0 10px;"> X </a> |
        <a href="https://feedrecap.com" style="color: #00A8E8; text-decoration: none; margin: 0 10px;"> FeedRecap </a>
        <p style="margin-top: 20px;">© 2025 FeedRecap. All Rights Reserved</p>
      </div>
    </div>
  `;

  const msg = {
    to: user.email,
    from: {
      email: process.env.FROM_EMAIL || "",
      name: "FeedRecap",
    },
    subject: "🚀 Your FeedRecap Newsletter Just Landed!",
    html: emailTemplate,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ [Email Sent]: Newsletter sent to ${user.email}`);

    // Save the generated newsletter in the user's document
    user.newsletter = newsletter;
    user.totalnewsletter = (user.totalnewsletter || 0) + 1;
    await user.save();
  } catch (error) {
    console.error(`❌ [Error]: Error sending email to ${user.email}:`, error);
  }
}

const fetchTweetsPeriodically = async () => {
  while (true) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Skip execution at 9 AM, 3 PM, and 8 PM
    if ([9, 15, 20].includes(hours)) {
      console.log(`⏸️ [Tweet Fetching]: Skipped execution at ${hours}:00`);
    } else if (minutes % 30 === 0) {
      console.log(
        "🔄 [Tweet Fetching]: Fetching fresh tweets for all categories..."
      );

      // Process categories sequentially (one at a time)
      const categories: string[] = [
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

      try {
        await fetchAndStoreTweets(categories);
      } catch (error) {
        console.error(
          `❌ [Error] Fetching tweets for category "${categories}" failed:`,
          error
        );
      }

      console.log("✅ [Tweet Fetching]: All categories updated successfully.");

      console.log(
        "🔄 [Custom Profiles]: Fetching fresh posts for user profiles..."
      );

      // Fetch all users with custom profiles
      const users = await User.find({ wise: "customProfiles" }).exec();

      // Extract unique profiles from all users
      const uniqueProfiles = new Set<string>();
      for (const user of users) {
        user.profiles.forEach((profile: string) => uniqueProfiles.add(profile));
      }

      const profilesArray: string[] = Array.from(uniqueProfiles);
      console.log(
        `📋 [Custom Profiles]: Found ${profilesArray.length} unique profiles.`
      );

      // Process 5 profiles at a time with error handling
      const PROFILE_BATCH_SIZE = 5;
      for (let i = 0; i < profilesArray.length; i += PROFILE_BATCH_SIZE) {
        const batch: string[] = profilesArray.slice(i, i + PROFILE_BATCH_SIZE);
        console.log(
          `🚀 [Custom Profiles]: Fetching batch ${
            i / PROFILE_BATCH_SIZE + 1
          }...`
        );

        // Store failed profiles
        let failedProfiles: string[] = [];

        // Attempt to fetch profiles
        const results = await Promise.allSettled([
          fetchAndStoreTweetsForProfiles(batch),
        ]);

        // Check for failed requests
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(
              `❌ [Error] Fetching tweets failed for profiles: ${batch}`,
              result.reason
            );
            failedProfiles.push(...batch);
          }
        });

        // Wait 1 second before starting the next batch
        if (i + PROFILE_BATCH_SIZE < profilesArray.length) {
          console.log(`⏳ [Custom Profiles]: Waiting 1s before next batch...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Retry fetching failed profiles once
        if (failedProfiles.length > 0) {
          console.log(
            `🔄 [Retry]: Retrying failed profiles: ${failedProfiles.join(", ")}`
          );

          const retryResults = await Promise.allSettled([
            fetchAndStoreTweetsForProfiles(failedProfiles),
          ]);

          retryResults.forEach((retryResult) => {
            if (retryResult.status === "rejected") {
              console.error(
                `❌ [Final Error] Retrying failed for profiles: ${failedProfiles}`,
                retryResult.reason
              );
            }
          });

          console.log(`✅ [Retry]: Completed retry attempt.`);
        }
      }

      console.log("✅ [Custom Profiles]: User profile tweets updated.");
    }

    // Wait 1 minute before checking again
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
  }
};

fetchTweetsPeriodically().catch(console.error);

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Function to process newsletters for all users at a specific time slot
async function processNewslettersForTimeSlot(timeSlot: string): Promise<void> {
  console.log(`⏰ [Debug] Processing newsletters for time slot: ${timeSlot}`);
  try {
    const users = await User.find({ time: timeSlot }).exec();
    if (users.length === 0) {
      console.log(`📭 [Debug] No users found for time slot: ${timeSlot}`);
      return;
    }

    console.log(
      `📋 [Debug] Found ${users.length} users for time slot: ${timeSlot}`
    );

    // Process users in batches of 5 parallel requests
    for (let i = 0; i < users.length; i += NUM_PARALLEL) {
      const batch = users.slice(i, i + NUM_PARALLEL);

      await Promise.all(
        batch.map(async (user) => {
          try {
            if (!isValidEmail(user.email)) {
              console.log(
                `⚠️ [Debug] Skipping user with invalid email: ${user.email}`
              );
              return;
            }

            if (!user.time || user.time.length === 0) {
              console.log(
                `⚠️ [Debug] Skipping user with no time preferences: ${user.email}`
              );
              return;
            }

            console.log(`📧 [Debug] Generating newsletter for: ${user.email}`);

            let newsletter = null;
            if (user.wise === "categorywise") {
              const { tweetsByCategory, top15Tweets } =
                await fetchTweetsForCategories(user.categories);
              newsletter = await generateNewsletter(
                tweetsByCategory,
                top15Tweets
              );
            } else if (user.wise === "customProfiles") {
              const { tweetsByProfiles, top15Tweets } =
                await getStoredTweetsForUser(
                  user._id as mongoose.Types.ObjectId
                );
              newsletter = await generateCustomProfileNewsletter(
                tweetsByProfiles,
                top15Tweets
              );
            }

            if (newsletter) {
              await sendNewsletterEmail(user, newsletter);
              console.log(`✅ [Debug] Newsletter sent to: ${user.email}`);
            }
          } catch (error) {
            console.error(
              `❌ [Debug] Error processing newsletter for ${user.email}:`,
              error
            );
          }
        })
      );
    }
    console.log(
      `✅ [Debug] Completed newsletter processing for time slot: ${timeSlot}`
    );
  } catch (error) {
    console.error(
      `❌ [Debug] Error processing newsletters for time slot: ${timeSlot}`,
      error
    );
  }
}

// Scheduler function (Restored from working code)
function runContinuousScheduler() {
  const scheduleTimes = {
    Morning: "09:00", // 9 AM Eastern
    Afternoon: "15:00", // 3 PM Eastern
    Night: "20:00", // 8 PM Eastern
  };

  setInterval(async () => {
    const currentTime = moment().tz("America/New_York").format("HH:mm");

    for (const [timeSlot, scheduledTime] of Object.entries(scheduleTimes)) {
      if (currentTime === scheduledTime) {
        console.log(
          `🎯 [Debug] Time matched for ${timeSlot}. Processing newsletters...`
        );
        await processNewslettersForTimeSlot(timeSlot);
      }
    }
  }, 60 * 1000); // Check every minute
}

// Start the scheduler
runContinuousScheduler();

const sendDigest = async () => {
  const totalUsers = await User.countDocuments({});

  // Example message for the digest
  const digestMessage = `As of now, we have a total of ${totalUsers} users in the system.`;

  // Logic to send the digest via email or another method
  const msg = {
    to: "jeremy.shoykhet+1@gmail.com",
    from: process.env.FROM_EMAIL || "",
    subject: `Automated FeedRecap's total user count update`,
    text: digestMessage,
  };

  try {
    await sgMail.send(msg);
    // console.log(`✅ [Email Sent]: Total User count`);
  } catch (error) {
    console.error(`❌ [Error]: Error Sending Total User count`);
  }

  const msg2 = {
    to: "pealh0320@gmail.com",
    from: process.env.FROM_EMAIL || "",
    subject: `Automated FeedRecap's total user count update`,
    text: digestMessage,
  };

  try {
    await sgMail.send(msg2);
    // console.log(`✅ [Email Sent]: Total User count`);
  } catch (error) {
    console.error(`❌ [Error]: Error Sending Total User count`);
  }

  const msg3 = {
    to: "support@overtonnews.com",
    from: process.env.FROM_EMAIL || "",
    subject: `Automated FeedRecap's total user count update`,
    text: digestMessage,
  };

  try {
    await sgMail.send(msg3);
    // console.log(`✅ [Email Sent]: Total User count`);
  } catch (error) {
    console.error(`❌ [Error]: Error Sending Total User count`);
  }
};

// Run the task every 4 hours
cron.schedule("0 */6 * * *", () => {
  sendDigest();
});

export async function fetchAndStoreTweetsForProfiles(
  profiles: string[]
): Promise<void> {
  if (!profiles.length) {
    console.warn(`⚠️ No profiles provided for fetching tweets.`);
    return;
  }

  for (const profile of profiles) {
    try {
      console.log(`🔄 [Fetching Fresh Tweets]: Fetching tweets for ${profile}`);

      const response = await axios.get(
        `https://${process.env.TWITTER_API_HOST}/timeline.php`,
        {
          params: { screenname: profile },
          headers: {
            "x-rapidapi-key": process.env.TWITTER_API_KEY,
            "x-rapidapi-host": process.env.TWITTER_API_HOST,
          },
        }
      );


      const now = moment();
      const past24Hours = now.subtract(24, "hours");

      const recentTweets = response.data.timeline.filter((tweet: any) => {
        const tweetTime = moment(
          tweet.created_at,
          "ddd MMM DD HH:mm:ss Z YYYY"
        );
        return tweetTime.isAfter(past24Hours);
      });

      if (!recentTweets.length) {
        throw new Error(`No tweets found for @${profile}`);
      }

      const topTweets = recentTweets
        .sort((a: any, b: any) => b.favorites - a.favorites)
        .slice(0, 25)
        .map((tweet: any) => ({
          text: removeLinksFromText(tweet.text),
          likes: tweet.favorites,
          tweet_id: tweet.tweet_id,
          createdAt: moment(
            tweet.created_at,
            "ddd MMM DD HH:mm:ss Z YYYY"
          ).toDate(),
          mediaThumbnail: extractMediaThumbnail(tweet),
          video: extractVideoUrl(tweet),
          videoThumbnail: extractVideoThumbnail(tweet),
          quotedTweet: extractQuotedTweet(tweet.quoted),
        }));

      let storedUser = await CustomProfilePosts.findOne({
        screenName: profile,
      }).select("avatar");
      let avatar = storedUser?.avatar || (await fetchAvatar(profile));

      // ✅ Store tweets in MongoDB
      const post = await CustomProfilePosts.findOneAndUpdate(
        { screenName: profile },
        { $set: { tweets: topTweets, avatar, createdAt: new Date() } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).exec();

      if (!post) {
        console.error(
          `❌ [Error]: MongoDB failed to save tweets for @${profile}`
        );
      } else {
        console.log(
          `✅ [Stored]: Successfully saved ${topTweets.length} tweets for @${profile}`
        );
      }
    } catch (err) {
      console.error(`❌ [Error]: Fetching tweets failed for ${profile}`);
    }
  }
}

export async function getStoredTweetsForUser(
  userId: mongoose.Types.ObjectId
): Promise<{
  tweetsByProfiles: { profile: string; tweets: string[] }[];
  top15Tweets: {
    screenName: string;
    text: string;
    likes: number;
    tweet_id: string;
  }[];
}> {
  const tweetsByProfiles: { profile: string; tweets: string[] }[] = [];
  const allTweetsWithLikes: {
    screenName: string;
    text: string;
    likes: number;
    tweet_id: string;
  }[] = [];

  try {
    console.log(
      `📂 [Retrieving Tweets]: Fetching stored tweets for user: ${userId}`
    );

    // ✅ Fetch user to get preferred profiles
    const user = await User.findById(userId).exec();
    if (!user || !user.profiles.length) {
      console.warn(`⚠️ No preferred profiles found for user: ${userId}`);
      return { tweetsByProfiles, top15Tweets: [] };
    }

    // ✅ Fetch posts from `CustomProfilePosts` that match user's preferred profiles
    const posts = await CustomProfilePosts.find({
      screenName: { $in: user.profiles },
    }).exec();

    if (!posts.length) {
      console.warn(`⚠️ No stored tweets found for user's profiles.`);
      return { tweetsByProfiles, top15Tweets: [] };
    }

    for (const post of posts) {
      if (!post.tweets.length) continue;

      const topTweets = post.tweets
        .sort((a, b) => Number(b.likes) - Number(a.likes))
        .slice(0, 25)
        .map((tweet: { text: any; likes: any; tweet_id: any }) => ({
          text: tweet.text.toString().slice(0, 300),
          likes: Number(tweet.likes),
          tweet_id: tweet.tweet_id.toString(),
          screenName: post.screenName, // Use screenName from post
        }));

      tweetsByProfiles.push({
        profile: post.screenName,
        tweets: topTweets.map((tweet) => tweet.text),
      });

      allTweetsWithLikes.push(...topTweets);
    }
  } catch (err) {
    console.error(
      `❌ [Error]: Retrieving stored tweets failed for user: ${userId}`
    );
  }

  // ✅ Ensure at most 1 top-liked tweet per account
  const top15Tweets = selectTopTweetsPerAccount(allTweetsWithLikes, 15);

  return { tweetsByProfiles, top15Tweets };
}

function selectTopTweetsPerAccount(
  allTweetsWithLikes: {
    screenName: string;
    text: string;
    likes: number;
    tweet_id: string;
  }[],
  limit: number
): {
  screenName: string;
  text: string;
  likes: number;
  tweet_id: string;
}[] {
  const topTweetsMap = new Map<
    string,
    { text: string; likes: number; tweet_id: string }
  >();

  allTweetsWithLikes.forEach((tweet) => {
    if (
      !topTweetsMap.has(tweet.screenName) ||
      tweet.likes > topTweetsMap.get(tweet.screenName)!.likes
    ) {
      topTweetsMap.set(tweet.screenName, {
        text: tweet.text,
        likes: tweet.likes,
        tweet_id: tweet.tweet_id,
      });
    }
  });

  return Array.from(topTweetsMap.entries())
    .map(([screenName, tweet]) => ({
      screenName,
      text: tweet.text,
      likes: tweet.likes,
      tweet_id: tweet.tweet_id,
    }))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, limit);
}

// DEEEPSEEK API
export async function generateCustomProfileNewsletter(
  tweetsByProfiles: {
    profile: string;
    tweets: string[];
  }[],
  top15Tweets: {
    screenName: string;
    text: string;
    likes: number;
    tweet_id: string;
  }[]
): Promise<string | undefined> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: process.env.CUSTOM_PROFILE_NEWSLETTER_PROMPT || "",
      },
      {
        role: "user",
        content:
          "Here is the tweet data you are summarizing:\n\n" +
          tweetsByProfiles
            .map(
              ({ profile, tweets }) =>
                `Tweets by @${profile}:\n${tweets.join("\n")}\n\n`
            )
            .join(""),
      },
    ];

    const response = await openai.chat.completions.create({
      messages,
      model: process.env.OPENAI_MODEL || "",
    });

    let result = response.choices[0].message.content;

    // Validate `top15Tweets` to ensure all objects have a valid `text`
    const validTopTweets = top15Tweets.filter(
      (tweet) => tweet.text && typeof tweet.text === "string"
    );

    // Append the valid top 15 tweets to the newsletter
    const topTweetsText = validTopTweets
      .map(
        (tweet, index) =>
          `${index + 1}. ${tweet.text.replace(/\n/g, " ")} @${
            tweet.screenName
          } <a href="https://x.com/${tweet.screenName}/status/${
            tweet.tweet_id
          }"> <em>View Post</em> </a>`
      )
      .join("\n\n");

    // Combine generated content with the valid top 15 tweets
    const finalNewsletterContent = `${result}\n\n**TOP POSTS OF TODAY:**\n${topTweetsText}`;

    // Convert the newsletter to HTML using `marked`
    const newsletterHTML = marked(finalNewsletterContent);

    return newsletterHTML;
  } catch (error) {
    console.error(
      "❌ [Error]: Error generating custom profile newsletter:",
      error
    );
    return undefined;
  }
}
