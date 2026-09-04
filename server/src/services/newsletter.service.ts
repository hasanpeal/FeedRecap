import mongoose from "mongoose";
import { marked } from "marked";
import OpenAI from "openai";
import "../config/env";
import { User, IUser } from "../models/user.model";
import { Newsletter } from "../models/newsletter.model";
import { StoredTweets, CustomProfilePosts } from "../models/tweet.model";
import sgMail from "./email.service";

const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "",
  apiKey: process.env.OPENAI,
});

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Posts are now retained for 7 days for the newsfeed, but the newsletter
// should keep summarizing what's fresh, not resurface a viral post from
// days ago every time it runs. So newsletter generation only looks at this
// recent window, then takes the top-liked posts within it — same behavior
// as before the 7-day retention was added, when storage itself only ever
// held the last 24 hours.
const NEWSLETTER_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const NEWSLETTER_TOP_PER_ACCOUNT = 25;

function topRecentTweets<
  T extends { createdAt: Date; likes: number }
>(tweets: T[]): T[] {
  const cutoff = new Date(Date.now() - NEWSLETTER_LOOKBACK_MS);
  return tweets
    .filter((tweet) => tweet.createdAt >= cutoff)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, NEWSLETTER_TOP_PER_ACCOUNT);
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
        tweets: topRecentTweets(tweetRecord.tweets).map((tweet) => tweet.text),
      }));
      tweetsByCategory.push({ category, tweetsByUser });

      // Store tweets with likes for the Top 15 calculation
      storedTweets.forEach((tweetRecord) => {
        topRecentTweets(tweetRecord.tweets).forEach((tweet) => {
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

      const topTweets = topRecentTweets(post.tweets).map(
        (tweet: { text: any; likes: any; tweet_id: any }) => ({
          text: tweet.text.toString().slice(0, 300),
          likes: Number(tweet.likes),
          tweet_id: tweet.tweet_id.toString(),
          screenName: post.screenName, // Use screenName from post
        })
      );

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
    <p style="color: #666;">Spread the word on X</p>
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
    subject: "Your FeedRecap Newsletter Just Landed!",
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
