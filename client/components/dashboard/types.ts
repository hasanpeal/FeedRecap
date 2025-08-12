export interface Post {
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

export interface UserProfile {
  username: string;
  avatar: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Notification {
  message: string;
  type: "success" | "error";
}

export interface TwitterAccount {
  screen_name: string;
  name: string;
  profile_image?: string;
}

export type FeedType = "categorywise" | "customProfiles";
export type SortBy = "time" | "likes";
export type SortOrder = "desc" | "asc";
