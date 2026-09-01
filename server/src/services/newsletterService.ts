import { marked } from "marked";
import OpenAI from "openai";

// Constructed lazily (on first generation call) rather than at module load,
// so a missing/empty OPENAI key fails only that call — caught below and
// logged like any other generation error — instead of crashing the entire
// server before it can even start serving unrelated routes.
let openai: OpenAI | undefined;
function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      baseURL: process.env.OPENAI_BASE_URL || "",
      apiKey: process.env.OPENAI,
    });
  }
  return openai;
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

    const response = await getOpenAIClient().chat.completions.create({
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

    const response = await getOpenAIClient().chat.completions.create({
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
