import axios from "axios";
import moment from "moment-timezone";
import { StoredTweets, CustomProfilePosts } from "../models/tweet.model";

function removeLinksFromText(text: string): string {
  return text.replace(/https?:\/\/\S+/g, "").trim(); // Removes all links starting with http/https
}

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

const RETENTION_DAYS = 7;

interface StoredTweetEntry {
  text: string;
  likes: number;
  tweet_id: string;
  createdAt: Date;
  mediaThumbnail: string | null;
  video: string | null;
  videoThumbnail: string | null;
  screenName?: string;
  quotedTweet: any;
}

// Merges freshly-fetched tweets into whatever is already stored for this
// account, deduping by tweet_id (a re-fetched tweet's like count etc. is
// refreshed from the new data) and dropping anything older than the
// retention window. This replaces the old "just overwrite with this fetch's
// top 25" approach, which meant nothing ever accumulated across fetches.
function mergeTweets(
  existingTweets: StoredTweetEntry[],
  newTweets: StoredTweetEntry[]
): StoredTweetEntry[] {
  const cutoff = moment().subtract(RETENTION_DAYS, "days").toDate();
  const byId = new Map<string, StoredTweetEntry>();

  for (const tweet of existingTweets) {
    if (tweet.createdAt >= cutoff) {
      byId.set(tweet.tweet_id, tweet);
    }
  }
  for (const tweet of newTweets) {
    byId.set(tweet.tweet_id, tweet);
  }

  return Array.from(byId.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

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
        `[Twitter] Error fetching avatar for ${username} (attempt ${retries + 1}/${maxRetries}):`,
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

        const newTweets: StoredTweetEntry[] = recentTweets.map(
          (tweet: any) => ({
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
          })
        );

        let avatar = await fetchAvatar(screenName);

        // Merge into whatever's already stored so posts accumulate across
        // fetches instead of being replaced each time.
        const existing = await StoredTweets.findOne({
          category,
          screenName,
        }).exec();
        const mergedTweets = mergeTweets(existing?.tweets ?? [], newTweets);

        await StoredTweets.findOneAndUpdate(
          { category, screenName },
          { tweets: mergedTweets, avatar, createdAt: new Date() },
          { upsert: true }
        );
      } catch (err: any) {
        console.error(
          `[Twitter] Error fetching tweets for ${screenName}:`,
          err.message
        );
        continue; // Skip to the next screen name without crashing
      }
    }
  }
}

export async function fetchAndStoreTweetsForProfiles(
  profiles: string[]
): Promise<void> {
  if (!profiles.length) {
    console.warn("[Twitter] No profiles provided for fetching tweets.");
    return;
  }

  for (const profile of profiles) {
    try {
      console.log(`[Twitter] Fetching tweets for ${profile}`);

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

      const newTweets: StoredTweetEntry[] = recentTweets.map(
        (tweet: any) => ({
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
        })
      );

      let avatar = await fetchAvatar(profile);

      // Merge into whatever's already stored so posts accumulate across
      // fetches instead of being replaced each time.
      const existing = await CustomProfilePosts.findOne({
        screenName: profile,
      }).exec();
      const mergedTweets = mergeTweets(existing?.tweets ?? [], newTweets);

      // ✅ Store tweets in MongoDB
      const post = await CustomProfilePosts.findOneAndUpdate(
        { screenName: profile },
        { $set: { tweets: mergedTweets, avatar, createdAt: new Date() } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).exec();

      if (!post) {
        console.error(`[Twitter] Failed to save tweets for @${profile}`);
      } else {
        console.log(
          `[Twitter] Saved ${newTweets.length} new tweet(s) for @${profile} (${mergedTweets.length} total in retention window)`
        );
      }
    } catch (err) {
      console.error(`[Twitter] Fetching tweets failed for ${profile}:`, err);
    }
  }
}
