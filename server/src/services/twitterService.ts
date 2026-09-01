import axios from "axios";
import mongoose from "mongoose";
import moment from "moment-timezone";
import { User } from "../models/userModel";
import { StoredTweets, CustomProfilePosts } from "../models/tweetModel";

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

function removeLinksFromText(text: string): string {
  return text.replace(/https?:\/\/\S+/g, "").trim(); // Removes all links starting with http/https
}

// How far back the newsfeed retains posts for an account.
const RECENT_WINDOW_DAYS = 7;

// Combines freshly fetched tweets with whatever is already stored for an
// account, dedupes by tweet_id (the fresh copy wins, e.g. updated like
// count), and drops anything that has fallen outside the retention window.
function mergeAndPruneTweets(
  existingTweets: any[],
  newTweets: any[],
  windowDays: number
): any[] {
  const cutoff = moment().subtract(windowDays, "days");
  const merged = new Map<string, any>();

  for (const tweet of existingTweets || []) {
    merged.set(tweet.tweet_id, tweet);
  }
  for (const tweet of newTweets) {
    merged.set(tweet.tweet_id, tweet);
  }

  return Array.from(merged.values())
    .filter((tweet) => moment(tweet.createdAt).isAfter(cutoff))
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

// Newsletters stay scoped to the last day's activity even though storage
// now retains a full week for the newsfeed.
const NEWSLETTER_WINDOW_HOURS = 24;

// Narrows an account's stored tweets down to the newsletter window and ranks
// them by likes, so a highly active account doesn't blow up the digest
// prompt now that storage itself retains a full 7 days of posts.
function recentTopByLikes<T extends { likes: number; createdAt: Date }>(
  tweets: T[],
  windowHours: number = NEWSLETTER_WINDOW_HOURS,
  limit = 25
): T[] {
  const cutoff = moment().subtract(windowHours, "hours");
  return tweets
    .filter((tweet) => moment(tweet.createdAt).isAfter(cutoff))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, limit);
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

        // Filter only the tweets posted within the retention window
        const cutoff = moment().subtract(RECENT_WINDOW_DAYS, "days");
        const tweets = response.data.timeline;

        const recentTweets = tweets.filter((tweet: any) => {
          const tweetTime = moment(
            tweet.created_at,
            "ddd MMM DD HH:mm:ss Z YYYY"
          );
          return tweetTime.isAfter(cutoff);
        });

        const newTweets = recentTweets.map((tweet: any) => ({
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

        let avatar = await fetchAvatar(screenName);

        const existing = await StoredTweets.findOne({ category, screenName })
          .select("tweets")
          .lean();

        const mergedTweets = mergeAndPruneTweets(
          existing?.tweets || [],
          newTweets,
          RECENT_WINDOW_DAYS
        );

        // Store the tweets in MongoDB
        await StoredTweets.findOneAndUpdate(
          { category, screenName },
          { tweets: mergedTweets, avatar, createdAt: new Date() },
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
      // Storage now retains a full week of posts per account for the
      // newsfeed; the newsletter digest itself stays scoped to the last 24
      // hours, ranked by likes.
      const tweetsByUser = storedTweets.map((tweetRecord) => ({
        screenName: tweetRecord.screenName,
        tweets: recentTopByLikes(tweetRecord.tweets).map((tweet) => tweet.text),
      }));
      tweetsByCategory.push({ category, tweetsByUser });

      // Store tweets with likes for the Top 15 calculation
      storedTweets.forEach((tweetRecord) => {
        recentTopByLikes(tweetRecord.tweets).forEach((tweet) => {
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

      const cutoff = moment().subtract(RECENT_WINDOW_DAYS, "days");

      const recentTweets = response.data.timeline.filter((tweet: any) => {
        const tweetTime = moment(
          tweet.created_at,
          "ddd MMM DD HH:mm:ss Z YYYY"
        );
        return tweetTime.isAfter(cutoff);
      });

      if (!recentTweets.length) {
        throw new Error(`No tweets found for @${profile}`);
      }

      const newTweets = recentTweets.map((tweet: any) => ({
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

      let avatar = await fetchAvatar(profile);

      const existing = await CustomProfilePosts.findOne({ screenName: profile })
        .select("tweets")
        .lean();

      const mergedTweets = mergeAndPruneTweets(
        existing?.tweets || [],
        newTweets,
        RECENT_WINDOW_DAYS
      );

      // ✅ Store tweets in MongoDB
      const post = await CustomProfilePosts.findOneAndUpdate(
        { screenName: profile },
        { $set: { tweets: mergedTweets, avatar, createdAt: new Date() } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).exec();

      if (!post) {
        console.error(
          `❌ [Error]: MongoDB failed to save tweets for @${profile}`
        );
      } else {
        console.log(
          `✅ [Stored]: Successfully saved ${mergedTweets.length} tweets for @${profile}`
        );
      }
    } catch (err) {
      console.error(`❌ [Error]: Fetching tweets failed for ${profile}`);
    }
  }
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

      const topTweets = recentTopByLikes(post.tweets).map(
        (tweet: { text: any; likes: any; tweet_id: any }) => ({
          text: tweet.text.toString().slice(0, 300),
          likes: Number(tweet.likes),
          tweet_id: tweet.tweet_id.toString(),
          screenName: post.screenName, // Use screenName from post
        })
      );

      if (!topTweets.length) continue;

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
