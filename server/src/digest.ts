//import axios from "axios";
import axios from "axios";
import mongoose, { Document, Schema } from "mongoose";
import sgMail from "@sendgrid/mail";
import cron from "node-cron";
import moment from "moment-timezone";
import { User, IUser } from "./userModel";
import db from "./db";
import dbTweet from "./dbTweet";
import { marked } from "marked";
import { htmlToText } from "html-to-text";
import { Newsletter } from "./newsletterModel";

// Set up SendGrid API
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

// MongoDB Tweet Document Interface
export interface ITweet extends Document {
  category: string;
  screenName: string;
  tweets: {
    text: string;
    likes: number;
    tweet_id: string;
    createdAt: Date; // Add `createdAt` to each tweet
  }[];
  createdAt: Date;
}

// Tweet Schema
export const tweetSchema: Schema = new mongoose.Schema({
  category: { type: String, required: true },
  screenName: { type: String, required: true },
  tweets: [
    {
      text: { type: String, required: true },
      likes: { type: Number, required: true },
      tweet_id: { type: String, required: true },
      createdAt: { type: Date, required: true }, // Store the tweet's creation time
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Models
export const StoredTweets = dbTweet.model<ITweet>("StoredTweets", tweetSchema);

export interface ICustomProfilePost extends Document {
  screenName: string; // Twitter profile's screen name
  tweets: [
    {
      text: { type: String, required: true },
      likes: { type: Number, required: true },
      tweet_id: { type: String, required: true },
      createdAt: { type: Date, required: true }, // Add `createdAt` for each tweet
    },
  ],
  createdAt: Date; // When the posts were fetched
}

const CustomProfilePostSchema: Schema = new Schema({
  screenName: { type: String, required: true },
  tweets: [
    {
      text: { type: String, required: true },
      likes: { type: Number, required: true },
      tweet_id: { type: String, required: true },
      createdAt: { type: Date, required: true }, // Add `createdAt` for each tweet
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export const CustomProfilePosts = db.model<ICustomProfilePost>(
  "CustomProfilePosts",
  CustomProfilePostSchema
);

// Ensure both databases are connected before running any logic
async function ensureDatabaseConnections() {
  return Promise.all([
    new Promise<void>((resolve, reject) => {
      db.once("connected", resolve);
      db.once("error", reject);
    }),
    new Promise<void>((resolve, reject) => {
      dbTweet.once("connected", resolve);
      dbTweet.once("error", reject);
    }),
  ]);
}

// Helper function to clean up markdown-like symbols (*, **, etc.)
async function cleanNewsletterText(text: string) {
 return text.replace(/\*\*|\*/g, "");
}

// Fetch and store tweets for specified categories
export async function fetchAndStoreTweets(categories: string[]): Promise<void> {
  console.log(
    "🔄 [Tweet Fetching Cron]: Fetching fresh tweets for all categories..."
  );
  const categoryAccounts: { [key: string]: string[] } = {
    // Politics: ["Politico", "Shellenberger", "Axios", "TheChiefNerd", "CNN"],
    // Geopolitics: ["Faytuks", "EndgameWWIII", "sentdefender", "Global_Mil_Info"],
    // Finance: ["financialjuice", "ForexLive", "DeItaone", "WSJ", "SullyCNBC"],
    // AI: ["pmddomingos", "AndrewYNg", "tegmark", "deepmind", "OpenAI"],
    // Tech: ["paulgraham", "ycombinator", "jason", "elonmusk", "shl"],
    // Crypto: ["VitalikButerin", "pierre_crypt0", "APompliano", "aantonop", "ErikVoorhees"],
    // Meme: ["stoolpresidente", "litcapital", "trustfundterry", "TheoVon"]
    Politics: ["Politico", "Shellenberger", "Axios", "TheChiefNerd"],
    Geopolitics: ["Faytuks", "EndgameWWIII", "sentdefender", "Global_Mil_Info"],
    Finance: ["financialjuice", "ForexLive", "DeItaone", "WSJ"],
    AI: ["pmddomingos", "AndrewYNg", "tegmark", "OpenAI"],
    Tech: ["paulgraham", "ycombinator", "jason", "elonmusk"],
    Crypto: [
      "VitalikButerin",
      "pierre_crypt0",
      "APompliano",
      "ErikVoorhees",
    ],
    Meme: ["stoolpresidente", "litcapital", "trustfundterry", "TheoVon"],
    Sports: ["SportsCenter", "WojESPN", "BleacherReport", "TheAthletic"],
    Entertainment: ["IMDb", "Netflix", "TheAVClub", "LightsCameraPod"]
  };

  for (const category of categories) {
    const screenNames = categoryAccounts[category];
    if (!screenNames) {
      console.log(`⚠️ No screen names found for category: ${category}`);
      continue;
    }

    for (const screenName of screenNames) {
      try {
        // Make the API call to fetch tweets
        const response = await axios.get(
          "https://twitter-api45.p.rapidapi.com/timeline.php",
          {
            params: { screenname: screenName },
            headers: {
              "x-rapidapi-key": process.env.RAPID_API_KEY || "",
              "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
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
          .slice(0, 10)
          .map((tweet: any) => ({
            text: removeLinksFromText(tweet.text),
            likes: tweet.favorites, // Accessing the 'favorites' field for likes
            tweet_id: tweet.tweet_id,
            createdAt: moment(
              tweet.created_at,
              "ddd MMM DD HH:mm:ss Z YYYY"
            ).toDate(), // Use tweet creation time
            screenName: screenName,
          }));

        // Store the tweets in MongoDB
        await StoredTweets.findOneAndUpdate(
          { category, screenName },
          { tweets: topTweets, createdAt: new Date() },
          { upsert: true }
        );

        console.log(
          `✅ [Stored]: Tweets for @${screenName} in ${category} have been stored.`
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

  console.log(
    `✅ [Completion]: All tweets for ${categories.join(
      ", "
    )} have been fetched and stored.`
  );
}

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
  const geminiOptions = {
    method: "POST",
    url: "https://gemini-pro-ai.p.rapidapi.com/",
    headers: {
      "x-rapidapi-key": process.env.RAPID_API_KEY || "",
      "x-rapidapi-host": "gemini-pro-ai.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    data: {
      contents: [
        {
          parts: [
            {
              text:
                `You're a skilled news reporter summarizing key tweets in an engaging and insightful newsletter. YOU MUST FOLLOW ALL 12 OF THESE RULES!! (Take as long as you want to process):

1. **Begin with a concise "Summary" section** that provides an overall 2-3 line overview of the main themes or highlights across all categories. Title this section "Summary".
2. **Consider ALL tweets across ALL categories**—do not focus on a few tweets. Make sure each category is fairly represented in the newsletter.
3. **Use emojis liberally** throughout the newsletter to make it engaging and visually appealing. Every section should contain at least 2-3 relevant emojis. For example: 🔥, 💡, 📈, 🚀, 💬, etc.
4. **Follow the themes of each category**, ensuring the content feels cohesive and relevant to the category. Each category should feel distinct.
5. **NO SUBJECT or FOOTER should be included**—only provide the newsletter content.
6. **Do NOT include links** or any references to external sources. You may mention persons or organizations, but no URLs.
7. **Do NOT cite sources**—just summarize the tweets without citations.
8. **Make it entertaining and creative**—use a casual tone, with short, punchy sentences. Think of this like a Twitter thread with personality and style.
9. IMPORTANT: **Use emojis often** to add emphasis and excitement to the newsletter. For example, use 📊 for data points, 🚀 for upward trends, 💡 for ideas, etc.
10. **Format the newsletter as bullet points** for each category. Each bullet point should summarize a key piece of information from the tweets, just as if you were a news reporter covering these topics. Write succinctly and clearly.
11. **Restrict yourself to only the information explicitly included in the tweets**—don’t add outside information or opinions.
12. Ensure the **bullet points are separated by category** and well-structured.

Here is the tweet data you are summarizing:
\n\n` +
                tweetsByCategory
                  .map(({ category, tweetsByUser }) => {
                    return (
                      `Category: ${category}\n` +
                      tweetsByUser
                        .map(
                          ({ screenName, tweets }) =>
                            `Tweets by @${screenName}:\n${tweets.join(
                              "\n"
                            )}\n\n`
                        )
                        .join("")
                    );
                  })
                  .join(""),
            },
          ],
        },
      ],
    },
  };

  try {
    const response = await axios.request(geminiOptions);
    let result = response.data.candidates[0].content.parts[0].text;
    console.log("Generated Content from Gemini AI: ", result);

    // Manually append the top 15 tweets to the end of the newsletter
    const topTweetsText = top15Tweets
      .map(
        (tweet, index) =>
          `${index + 1}. ${tweet.tweet.replace(/\n/g, " ")} - @${
            tweet.screenName
          } <a href="https://x.com/${tweet.screenName}/status/${
            tweet.tweet_id
          }"> <em>Tweet</em> </a>`
      )
      .join("\n\n");


      console.log("Top Tweets to be included: ", topTweetsText);
    // Append the top 15 tweets to the Gemini-generated newsletter
    const finalNewsletterContent = `${result}\n\n**TOP TWEETS OF TODAY:**\n${topTweetsText}`;


    console.log("Final Newsletter Content: ", finalNewsletterContent);
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
            tweet: tweet.text,
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

  // Final logging to verify selection of tweets
  console.log(`🔄 [Top 15 Tweets]: Collected ${uniqueTop15Tweets.length} tweets`);
  console.log(uniqueTop15Tweets);

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

  // Encode the newsletter content for sharing via email
  const encodedNewsletterContent = encodeURIComponent(newsletter);

  // Share buttons with individual lines and additional spacing
  const shareButtons = `
    <div style="text-align: center; margin-top: 20px;">
      <h3>Share this Newsletter:</h3>
      <div style="margin-bottom: 10px;">
        <a href="https://wa.me/?text=${encodeURIComponent(
          `Check out this newsletter: ${shortLink}`
        )}" style="padding: 10px 20px; background-color: #25D366; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-bottom: 10px;">Share on WhatsApp</a>
      </div>
      <div style="margin-bottom: 10px;">
        <a href="https://t.me/share/url?url=${shortLink}&text=${encodeURIComponent(
    "Check out this newsletter!"
  )}" style="padding: 10px 20px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-bottom: 10px;">Share on Telegram</a>
      </div>
      <div style="margin-bottom: 10px;">
        <a href="mailto:?subject=FeedRecap Newsletter&body=${shortLink}" style="padding: 10px 20px; background-color: #D44638; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-bottom: 10px;">Share via Email</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <p>Read the newsletter online: <a href="${shortLink}"><em>${shortLink}</em></a></p>
    </div>
  `;

  const msg = {
    to: user.email,
    from: {
      email: process.env.FROM_EMAIL || "",
      name: "FeedRecap",
    },
    subject: "Your personalized newsletter from FeedRecap 👋",
    html: `${newsletter} ${shareButtons}`,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ [Email Sent]: Newsletter sent to ${user.email}`);
    // Save the generated newsletter in the user's document
    user.newsletter = newsletter; // Save the updated newsletter
    user.totalnewsletter = (user.totalnewsletter || 0) + 1;
    await user.save();
    console.log(`✅ [Database Updated]: Newsletter saved for ${user.email}`);
  } catch (error) {
    console.error(`❌ [Error]: Error sending email to ${user.email}:`, error);
  }
}


// First cron job: Fetch new tweets every 4 hours
cron.schedule(
  "0 */4 * * *",
  async () => {
    console.log(
      "🔄 [Tweet Fetching Cron]: Fetching fresh tweets for all categories..."
    );

    // Fetch and store tweets for all categories
    await fetchAndStoreTweets([
      "Politics",
      "Geopolitics",
      "Finance",
      "AI",
      "Tech",
      "Crypto",
      "Meme",
      "Sports",
      "Entertainment",
    ]);

    console.log("✅ [Tweet Fetching Cron]: Tweets have been updated.");
  },
  {
    scheduled: true,
    timezone: "UTC",
  }
);

// Second cron job: Send newsletters to users based on their time preferences
// cron.schedule(
//   "0 * * * *", // This cron job runs every hour
//   async () => {
//     console.log(
//       "⏰ [Newsletter Cron]: Running scheduled cron job for newsletters..."
//     );

//     const users = await User.find({}).exec();
//     const currentTime = moment().utc();

//     for (const user of users) {
//         // Process newsletters for users with their time-based preferences (Morning, Afternoon, Night)
//         const userLocalTime = currentTime.clone().tz(user.timezone);
//         const currentHour = userLocalTime.hour();
//         const timeSlot =
//           currentHour === 9
//             ? "Morning"
//             : currentHour === 15
//             ? "Afternoon"
//             : currentHour === 20
//             ? "Night"
//             : null;

//         if (timeSlot && user.time.includes(timeSlot)) {
//           console.log(
//             `📧 Generating newsletter for ${user.email} (${timeSlot})`
//           );

//           const { tweetsByCategory, top15Tweets } =
//             await fetchTweetsForCategories(user.categories);
//           const newsletter = await generateNewsletter(
//             tweetsByCategory,
//             top15Tweets
//           );

//           if (newsletter) {
//             await sendNewsletterEmail(user, newsletter);
//           }
//         }
//     }
//   },
//   {
//     scheduled: true,
//     timezone: "UTC",
//   }
// );

cron.schedule(
  "0 */4 * * *", // Every 4 hours
  async () => {
    console.log(
      "🔄 [Custom Profiles Cron]: Fetching fresh posts for user profiles..."
    );

    const users = await User.find({ wise: "customProfiles" }).exec(); // Get users using custom profiles

    for (const user of users) {
      try {
        console.log(
          `🛠️ [Custom Profiles]: Fetching tweets for ${user.email}...`
        );

        // Fetch and save posts for the user's custom profiles
        const { tweetsByProfiles } = await fetchTweetsForProfiles(
          user.profiles,
          user._id as mongoose.Types.ObjectId
        );

        console.log(`✅ [Custom Profiles]: Fetched posts for ${user.email}.`);
      } catch (error) {
        console.error(
          `❌ [Custom Profiles]: Error fetching posts for ${user.email}:`,
          error
        );
      }
    }
  },
  {
    scheduled: true,
    timezone: "UTC",
  }
);


cron.schedule(
  "0 * * * *", // This cron job runs every hour
  async () => {
    console.log(
      "⏰ [Newsletter Cron]: Running scheduled cron job for newsletters..."
    );

    const users = await User.find({}).exec();
    const currentTime = moment().utc();

    for (const user of users) {
      const userLocalTime = currentTime.clone().tz(user.timezone);
      const currentHour = userLocalTime.hour();
      const timeSlot =
        currentHour === 9
          ? "Morning"
          : currentHour === 15
          ? "Afternoon"
          : currentHour === 20
          ? "Night"
          : null;

      if (timeSlot && user.time.includes(timeSlot)) {
        console.log(`📧 Generating newsletter for ${user.email} (${timeSlot})`);

        if (user.wise === "categorywise") {
          // Existing categorywise functionality
          const { tweetsByCategory, top15Tweets } =
            await fetchTweetsForCategories(user.categories);
          const newsletter = await generateNewsletter(
            tweetsByCategory,
            top15Tweets
          );

          if (newsletter) {
            await sendNewsletterEmail(user, newsletter);
          }
        } else if (user.wise === "customProfiles") {
          // New customProfiles functionality
          console.log(
            `🛠️ [Custom Profiles]: Generating newsletter for custom profiles for ${user.email}`
          );

          const { tweetsByProfiles, top15Tweets } =
            await fetchTweetsForProfiles(
              user.profiles,
              user._id as mongoose.Types.ObjectId
            ); // Pass user._id here
          const newsletter = await generateCustomProfileNewsletter(
            tweetsByProfiles,
            top15Tweets
          );

          if (newsletter) {
            await sendNewsletterEmail(user, newsletter);
          }
        }
      }
    }
  },
  {
    scheduled: true,
    timezone: "UTC",
  }
);


const sendDigest = async () => {
  const totalUsers = await User.countDocuments({});

  // Example message for the digest
  const digestMessage = `As of now, we have a total of ${totalUsers} users in the system.`;

  // Logic to send the digest via email or another method
  const msg = {
    to: "jeremy.shoykhet+1@gmail.com",
    from: process.env.FROM_EMAIL || "",
    subject: `Automated FeedRecap's total user count update`,
    text: digestMessage
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ [Email Sent]: Total User count`);
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
    console.log(`✅ [Email Sent]: Total User count`);
  } catch (error) {
    console.error(`❌ [Error]: Error Sending Total User count`);
  }
};

// Run the task every 4 hours
cron.schedule('0 */6 * * *', () => {
  console.log('Sending Digest: Total user count');
  sendDigest();
});

































export async function fetchTweetsForProfiles(
  profiles: string[],
  userId: mongoose.Types.ObjectId
): Promise<{
  tweetsByProfiles: { profile: string; tweets: string[] }[];
  top15Tweets: {
    screenName: string;
    text: string; // Use `text` as the key for tweet content
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

  for (const profile of profiles) {
    try {
      console.log(`🔄 [Debug]: Fetching tweets for profile: ${profile}`);

      const response = await axios.get(
        "https://twitter-api45.p.rapidapi.com/timeline.php",
        {
          params: { screenname: profile },
          headers: {
            "x-rapidapi-key": process.env.RAPID_API_KEY || "",
            "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
          },
        }
      );

      console.log(
        `✅ [Debug]: API response for ${profile}:`,
        JSON.stringify(response.data, null, 2)
      );

      const tweets = response.data.timeline;

      // Filter and process tweets
      const now = moment();
      const past24Hours = now.subtract(24, "hours");

      const recentTweets = tweets.filter((tweet: any) => {
        const tweetTime = moment(
          tweet.created_at,
          "ddd MMM DD HH:mm:ss Z YYYY"
        );
        return tweetTime.isAfter(past24Hours);
      });

      const topTweets = recentTweets
        .sort((a: any, b: any) => b.favorites - a.favorites)
        .slice(0, 10)
        .map(
          (tweet: {
            text: string;
            favorites: number;
            tweet_id: string;
            created_at: string;
          }) => ({
            text: removeLinksFromText(tweet.text),
            likes: tweet.favorites,
            tweet_id: tweet.tweet_id,
            createdAt: moment(
              tweet.created_at,
              "ddd MMM DD HH:mm:ss Z YYYY"
            ).toDate(),
            screenName: profile,
          })
        );

      console.log(
        `✅ [Debug]: Top 10 tweets for ${profile}:`,
        JSON.stringify(topTweets, null, 2)
      );

      // Save tweets to the database
      const post = await CustomProfilePosts.findOneAndUpdate(
        { screenName: profile },
        { tweets: topTweets },
        { upsert: true, new: true }
      ).exec();

      if (post) {
        const user = await User.findById(userId).exec();
        if (user) {
          if (!user.posts.includes(post._id as mongoose.Types.ObjectId)) {
            user.posts.push(post._id as mongoose.Types.ObjectId);
            await user.save();
            console.log(
              `✅ [Updated User]: Added post reference for @${profile} to user ${user.email}`
            );
          }
        }
      }

      tweetsByProfiles.push({
        profile,
        tweets: topTweets.map((tweet: { text: string }) => tweet.text),
      });

      allTweetsWithLikes.push(...topTweets);
    } catch (err: any) {
      if (err.response) {
        console.error(
          `❌ [Error]: API Error for ${profile}:`,
          JSON.stringify(err.response.data, null, 2)
        );
      } else {
        console.error(
          `❌ [Error]: Request failed for ${profile}:`,
          err.message
        );
      }
      continue; // Skip to the next profile
    }
  }

  const top15Tweets = allTweetsWithLikes
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 15);

  console.log(
    `✅ [Debug]: Top 15 tweets across all profiles:`,
    JSON.stringify(top15Tweets, null, 2)
  );

  return { tweetsByProfiles, top15Tweets };
}






export async function generateCustomProfileNewsletter(
  tweetsByProfiles: {
    profile: string;
    tweets: string[];
  }[],
  top15Tweets: {
    screenName: string;
    text: string; // Correct property name
    likes: number;
    tweet_id: string;
  }[]
): Promise<string | undefined> {
  const geminiOptions = {
    method: "POST",
    url: "https://gemini-pro-ai.p.rapidapi.com/",
    headers: {
      "x-rapidapi-key": process.env.RAPID_API_KEY || "",
      "x-rapidapi-host": "gemini-pro-ai.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    data: {
      contents: [
        {
          parts: [
            {
              text:
                `You're a skilled news reporter summarizing key tweets in an engaging and insightful newsletter. YOU MUST FOLLOW ALL 9 OF THESE RULES!! (Take as long as you want to process):

1. **Begin with a concise "Summary" section** that provides an overall 2-3 line overview of the main themes or highlights across all tweets. Title this section "Summary".
2. **Consider ALL tweets across ALL categories**—do not focus on a few tweets. Make sure each category is fairly represented in the newsletter.
3. **Use emojis liberally** throughout the newsletter to make it engaging and visually appealing. Every section should contain at least 2-3 relevant emojis. For example: 🔥, 💡, 📈, 🚀, 💬, etc.
4. **NO SUBJECT or FOOTER should be included**—only provide the newsletter content.
5. **Do NOT include links** or any references to external sources. You may mention persons or organizations, but no URLs.
6. **Do NOT cite sources**—just summarize the tweets without citations.
7. **Make it entertaining and creative**—use a casual tone, with short, punchy sentences. Think of this like a Twitter thread with personality and style.
8. IMPORTANT: **Use emojis often** to add emphasis and excitement to the newsletter. For example, use 📊 for data points, 🚀 for upward trends, 💡 for ideas, etc.
9. **Restrict yourself to only the information explicitly included in the tweets**—don’t add outside information or opinions.
Here is the tweet data you are summarizing:\n\n` +
                tweetsByProfiles
                  .map(
                    ({ profile, tweets }) =>
                      `Tweets by @${profile}:\n${tweets.join("\n")}\n\n`
                  )
                  .join(""),
            },
          ],
        },
      ],
    },
  };

  try {
    // Debug `top15Tweets` array
    console.log("✅ [Debug]: Validating top15Tweets:", top15Tweets);

    // Validate `top15Tweets` to ensure all objects have a valid `text`
    const validTopTweets = top15Tweets.filter(
      (tweet) => tweet.text && typeof tweet.text === "string"
    );

    console.log(
      "✅ [Debug]: Valid top tweets (after filtering invalid ones):",
      validTopTweets
    );

    const response = await axios.request(geminiOptions);
    let result = response.data.candidates[0].content.parts[0].text;
    console.log("Generated Content from Gemini AI: ", result);

    // Append the valid top 15 tweets to the newsletter
    const topTweetsText = validTopTweets
      .map(
        (tweet, index) =>
          `${index + 1}. ${tweet.text.replace(/\n/g, " ")} - @${
            tweet.screenName
          } 👉 <a href="https://x.com/${tweet.screenName}/status/${
            tweet.tweet_id
          }"> Tweet </a>`
      )
      .join("\n\n");

    console.log("Top Tweets to be included: ", topTweetsText);

    // Combine Gemini-generated content with the valid top 15 tweets
    const finalNewsletterContent = `${result}\n\n**TOP TWEETS OF TODAY:**\n${topTweetsText}`;

    console.log("Final Newsletter Content: ", finalNewsletterContent);

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





// async function testProfileswiseByEmail(userEmail: string) {
//   try {
//     // Step 1: Fetch the user by email
//     const user = await User.findOne({ email: userEmail }).exec();
//     if (!user) {
//       console.error(`❌ [Test]: User with email ${userEmail} not found.`);
//       return;
//     }

//     console.log("✅ [Test]: User fetched:", user.email);

//     // Step 2: Check if the user is using "customProfiles"
//     if (user.wise !== "customProfiles") {
//       console.error(
//         `❌ [Test]: User ${user.email} is not using customProfiles. Current mode: ${user.wise}`
//       );
//       return;
//     }

//     if (!user.profiles || user.profiles.length === 0) {
//       console.error(
//         `❌ [Test]: User ${user.email} has no profiles configured.`
//       );
//       return;
//     }

//     console.log(
//       `✅ [Test]: User ${user.email} has profiles configured:`,
//       user.profiles
//     );

//     // Step 3: Fetch tweets for the profiles
//     const { tweetsByProfiles, top15Tweets } = await fetchTweetsForProfiles(
//       user.profiles,
//       user._id as mongoose.Types.ObjectId
//     );

//     console.log(`✅ [Test]: Fetched tweets for profiles:`, tweetsByProfiles);
//     console.log(`✅ [Test]: Top 15 tweets:`, top15Tweets);

//     // Step 4: Generate the newsletter
//     const newsletter = await generateCustomProfileNewsletter(
//       tweetsByProfiles,
//       top15Tweets
//     );

//     if (!newsletter) {
//       console.error(`❌ [Test]: Failed to generate the newsletter.`);
//       return;
//     }

//     console.log(`✅ [Test]: Newsletter generated successfully.`);

    

//     console.log(
//       `✅ [Test]: Newsletter saved for user ${user.email}.`
//     );
//   } catch (error) {
//     console.error("❌ [Test]: An error occurred during the test:", error);
//   }
// }

// // Call the function with a test user email
// testProfileswiseByEmail("pealh0320@gmail.com");


async function testNewsletter() {
  try {
    // Fetch the user
    const user = await User.findOne({ email: "pealh0320@gmail.com" }).exec();
    if (!user) {
      console.error("❌ User not found with email: pealh0320@gmail.com");
      return;
    }

    // Define categories for the test (based on user preferences)
    const categories = ["Politics", "Geopolitics", "Finance", "AI"];

    // Fetch tweets for the categories
    const { tweetsByCategory, top15Tweets } = await fetchTweetsForCategories(
      categories
    );

    // Generate the newsletter
    const newsletter = await generateNewsletter(tweetsByCategory, top15Tweets);

    if (!newsletter) {
      console.error("❌ Failed to generate newsletter.");
      return;
    }

    // Send the newsletter
    await sendNewsletterEmail(user, newsletter);

    console.log("✅ Test newsletter sent successfully to pealh0320@gmail.com.");
  } catch (error) {
    console.error("❌ Error during test:", error);
  }
}

testNewsletter();