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

// Set up SendGrid API
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

// async function dbConnect() {
//   let connection = await db;
//   if(connection) console.log("✅ [User Database]: Connected to the user database.");
// }

// dbConnect();


// MongoDB Tweet Document Interface
interface ITweet extends Document {
  category: string;
  screenName: string;
  tweets: { text: string; likes: number }[];
  createdAt: Date;
}

// Tweet Schema
const tweetSchema: Schema = new mongoose.Schema({
  category: { type: String, required: true },
  screenName: { type: String, required: true },
  tweets: [{ text: String, likes: Number }],
  createdAt: { type: Date, default: Date.now },
});

// Models
const StoredTweets = dbTweet.model<ITweet>("StoredTweets", tweetSchema);

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
async function fetchAndStoreTweets(categories: string[]): Promise<void> {
  const categoryAccounts: { [key: string]: string[] } = {
    Politics: [
      "Politico",
      "Shellenberger",
      "Axios",
      "TheChiefNerd",
      "CNN",
      "BBCWorld",
      "Reuters",
      "NYTimes",
      "MarioNawfal",
      "CollinRugg",
      "spectatorindex",
      "NPR",
      "TheEconomist",
      "AP_Politics",
      "Noahpinion",
      "TheOmniLiberal",
      "EricRWeinstein",
      "NateSilver538",
      "jarvis_best",
      "AlexThomp",
      "elonmusk",
      "micsolana",
      "pmarca",
      "ScottJenningsKY",
      "mattyglesias",
      "Tyler_A_Harper",
      "DKThomp",
      "samstein",
      "greg_price11",
      "teddyschleifer",
      "realDonaldTrump",
      "Geiger_Capital",
      "DavidSacks",
      "asymmetricinfo",
    ],
    Geopolitics: [
      "Faytuks",
      "EndgameWWIII",
      "sentdefender",
      "Global_Mil_Info",
      "RealestMercury",
    ],
    Finance: [
      "financialjuice",
      "ForexLive",
      "DeItaone",
      "SullyCNBC",
      "JoeSquawk",
      "CorneliaLake",
      "SpecialSitsNews",
      "TheTranscript_",
      "BNONews",
      "Geiger_Capital",
      "DanielSLoeb1",
      "LongShortTrader",
      "WSJ",
    ],
    AI: [
      "pmddomingos",
      "AndrewYNg",
      "tegmark",
      "ylecun",
      "GaryMarcus",
      "hardmaru",
      "fchollet",
      "DrJimFan",
      "goodfellow_ian",
      "ylecun",
      "mmitchell_ai",
      "schmidhuberai",
      "feather",
      "tegmark",
      "gdb",
      "lexfridman",
      "OpenAI",
      "deepmind",
      "anthropicai",
      "neiltyson",
      "tegmark",
      "elonmusk",
      "micsolana",
      "pmarca",
      "sama",
      "ESYudkowsky",
    ],
    Tech: [
      "paulgraham",
      "ycombinator",
      "jason",
      "sriramk",
      "shl",
      "garrytan",
      "naval",
      "a16z",
      "felicis",
      "eladgil",
      "reidhoffman",
      "levie",
      "joshk",
      "jesslivingston",
      "svangel",
      "eriktorenberg",
      "semil",
      "davemorin",
      "austen",
      "jason",
      "elonmusk",
      "micsolana",
      "pmarca",
      "amasad",
      "nikitabier",
      "PalmerLuckey",
      "JTLonsdale",
      "loganbartlett",
      "DavidSacks",
    ],
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

        // Process tweets: Sort by likes and get the top 10
        // Filter tweets to include only those from the last 24 hours
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
          .sort((a: any, b: any) => b.favorite_count - a.favorite_count)
          .slice(0, 10)
          .map((tweet: any) => ({
            text: tweet.text,
            likes: tweet.favorite_count,
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
        // Skip to the next screen name without crashing
        continue;
      }
    }
  }

  console.log(
    `✅ [Completion]: All tweets for ${categories.join(
      ", "
    )} have been fetched and stored.`
  );
}


// Generate newsletter using Gemini AI
async function generateNewsletter(
  tweetsByCategory: {
    category: string;
    tweetsByUser: { screenName: string; tweets: string[] }[];
  }[],
  top5Tweets: {
    screenName: string;
    category: string;
    tweet: string;
    likes: number;
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
                `Create a detailed, engaging, and catchy newsletter based on the tweets below, following these strict rules:

1. **Include emojis liberally** throughout the newsletter to make it engaging. Make sure every paragraph or section includes at least 2-3 relevant emojis. For example: 🔥, 💡, 📈, 🚀, 💬, etc.
2. **Follow the themes of each category**, ensuring the content feels cohesive to the category.
3. **NO SUBJECT or FOOTER should be provided**—I only need the newsletter content.
4. **Do NOT include links** or any references to external sources. But you can mention persons/organization name.
5. **Do NOT cite the sources**.
6. Make it **entertaining** and **creative** with a casual tone, using short, punchy sentences where possible. Think of this like writing a Twitter thread with style and personality.
7. IMPORTANT: Use **emojis** often to add emphasis, excitement, and style to the newsletter. For example, use 📊 for data points, 🚀 for upward trends, 💡 for new ideas, etc.
8. Make sure you actually consider all tweets of all categories before generating newsletter.
:\n\n` +
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
    console.log(result);

    // Manually append the top 5 tweets to the end of the newsletter
    const topTweetsText = top5Tweets
      .map(
        (tweet, index) => `${index + 1}. ${tweet.tweet} - @${tweet.screenName}`
      )
      .join("\n\n");

    // 2. Manually append the top 5 tweets to the Gemini-generated newsletter
    const finalNewsletterContent = `${result}\n\n**TOP 5 TWEETS OF TODAY:**\n${topTweetsText}`;

    // 3. Convert the newsletter to HTML using `marked`
    const newsletterHTML = marked(finalNewsletterContent);

    return newsletterHTML;
  } catch (error) {
    console.error("❌ [Error]: Error generating newsletter:", error);
    return undefined;
  }
}


// Function to calculate top 5 tweets from different users
async function fetchTweetsForCategories(
  categories: string[]
): Promise<{ tweetsByCategory: any[]; top5Tweets: any[] }> {
  const tweetsByCategory: {
    category: string;
    tweetsByUser: { screenName: string; tweets: string[] }[];
  }[] = [];
  const allTweetsWithLikes: {
    screenName: string;
    category: string;
    tweet: string;
    likes: number;
  }[] = [];

  for (const category of categories) {
    const storedTweets = await StoredTweets.find({ category }).exec();

    if (storedTweets.length) {
      const tweetsByUser = storedTweets.map((tweetRecord) => ({
        screenName: tweetRecord.screenName,
        tweets: tweetRecord.tweets.map((tweet) => tweet.text),
      }));
      tweetsByCategory.push({ category, tweetsByUser });

      // Store tweets with likes for Top 5 calculation
      storedTweets.forEach((tweetRecord) => {
        tweetRecord.tweets.forEach((tweet) => {
          allTweetsWithLikes.push({
            screenName: tweetRecord.screenName,  // Ensure screenName is included
            category: tweetRecord.category,
            tweet: tweet.text,
            likes: tweet.likes,
          });
        });
      });
    }
  }

  // Group tweets by user to ensure diversity
  const groupedByUser: { [screenName: string]: { screenName: string; category: string; tweet: string; likes: number }[] } = {};
  allTweetsWithLikes.forEach(tweetData => {
    if (!groupedByUser[tweetData.screenName]) {
      groupedByUser[tweetData.screenName] = [];
    }
    groupedByUser[tweetData.screenName].push(tweetData);
  });

  // Now select the top tweet from 5 different users
  const uniqueTop5Tweets: {
    screenName: string;
    category: string;
    tweet: string;
    likes: number;
  }[] = [];

  // Prioritize selecting from different categories and users
  Object.keys(groupedByUser).forEach((screenName) => {
    const userTweets = groupedByUser[screenName];
    if (userTweets.length) {
      // Sort the user's tweets by likes
      const topTweet = userTweets.sort((a, b) => b.likes - a.likes)[0];
      if (uniqueTop5Tweets.length < 5) {
        uniqueTop5Tweets.push({
          screenName: topTweet.screenName,  // Explicitly include screenName here
          category: topTweet.category,
          tweet: topTweet.tweet,
          likes: topTweet.likes,
        });
      }
    }
  });

  // Sort by likes again if necessary to maintain the "top tweets" feel
  const top5Tweets = uniqueTop5Tweets
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5);

  return { tweetsByCategory, top5Tweets };
}


// Send email using SendGrid
async function sendNewsletterEmail(
  user: IUser,
  newsletter: string
): Promise<void> {
  const msg = {
    to: user.email,
    from: process.env.FROM_EMAIL || "",
    subject: `Your personalized newsletter from FeedRecap 👋`,
    html: newsletter,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ [Email Sent]: Newsletter sent to ${user.email}`);
    // Save the generated newsletter in the user's document
    user.newsletter = newsletter;
    user.totalnewsletter = (user.totalnewsletter || 0) + 1;
    await user.save();
    console.log(`✅ [Database Updated]: Newsletter saved for ${user.email}`);
  } catch (error) {
    console.error(`❌ [Error]: Error sending email to ${user.email}:`, error);
  }
}

// First cron job: Fetch new tweets every 6 hours
cron.schedule(
  "0 */6 * * *",
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
    ]);

    console.log("✅ [Tweet Fetching Cron]: Tweets have been updated.");
  },
  {
    scheduled: true,
    timezone: "UTC",
  }
);

// Second cron job: Send newsletters to users based on their time preferences
cron.schedule(
  "0 * * * *",
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

        const { tweetsByCategory, top5Tweets } = await fetchTweetsForCategories(
          user.categories
        );
        const newsletter = await generateNewsletter(
          tweetsByCategory,
          top5Tweets
        );

        if (newsletter) {
          await sendNewsletterEmail(user, newsletter);
        }
      }
    }
  },
  {
    scheduled: true,
    timezone: "UTC",
  }
);

// //Temporary test function to manually trigger tweet fetching and newsletter sending
// async function testNewsletterProcessManually() {
//   console.log(
//     "🔄 [Manual Test]: Starting the manual tweet fetching and newsletter generation process..."
//   );

  
//   // Fetch a sample user for testing (make sure the user exists in your database)
//   const user = await User.findOne({ email: "pealh0320@gmail.com" }).exec(); // Replace with a valid email
//   if (!user) {
//     console.log("❌ [Manual Test]: No user found for testing.");
//     return;
//   }

//   // Fetch the tweets for this user's categories
//   const { tweetsByCategory, top5Tweets } = await fetchTweetsForCategories(
//     user.categories
//   );

//   // Generate the newsletter
//   const newsletter = await generateNewsletter(tweetsByCategory, top5Tweets);

//   if (newsletter) {
//     // Send the email (or store the newsletter in user model)
//     await sendNewsletterEmail(user, newsletter);
//     console.log(
//       "✅ [Manual Test]: Newsletter generated and sent successfully."
//     );
//   } else {
//     console.log("❌ [Manual Test]: Error in generating the newsletter.");
//   }

//   console.log(
//     "✅ [Manual Test Completed]: Check your logs and email for the results."
//   );
// }

// // Call the test function to trigger the process manually
// testNewsletterProcessManually();

