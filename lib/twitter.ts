import { Scraper } from "agent-twitter-client";

export class TwitterApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TwitterApiError";
  }
}

export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  media: string[];
  url: string;
}

export interface Profile {
  id: string;
  username: string;
  name: string;
}

export async function fetchProfileAndTweets(
  username: string,
  onProgress?: (pagesFetched: number, postsFetched: number) => void
): Promise<{
  profile: Profile;
  posts: Tweet[];
}> {
  const scraper = new Scraper();

  let profileData;
  try {
    profileData = await scraper.getProfile(username);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (message.includes("not found") || message.includes("does not exist")) {
      throw new TwitterApiError("Profile not found.");
    }
    throw new TwitterApiError("Failed to fetch profile. Please check the username and try again.");
  }

  if (!profileData || !profileData.userId) {
    throw new TwitterApiError("Profile not found.");
  }

  const profile: Profile = {
    id: profileData.userId,
    username: profileData.username || username,
    name: profileData.name || username,
  };

  const posts: Tweet[] = [];
  let pagesFetched = 0;
  let batchCount = 0;

  try {
    for await (const tweet of scraper.getTweets(username, 50000)) {
      if (!tweet.id) continue;

      const mediaUrls: string[] = [];
      if (tweet.photos) {
        for (const photo of tweet.photos) {
          if (photo.url) mediaUrls.push(photo.url);
        }
      }
      if (tweet.videos) {
        for (const video of tweet.videos) {
          if (video.url) mediaUrls.push(video.url);
        }
      }

      const createdAt = tweet.timeParsed
        ? tweet.timeParsed.toISOString()
        : tweet.timestamp
        ? new Date(tweet.timestamp * 1000).toISOString()
        : new Date().toISOString();

      posts.push({
        id: tweet.id,
        text: tweet.text ?? "",
        createdAt,
        likes: tweet.likes ?? 0,
        retweets: tweet.retweets ?? 0,
        replies: tweet.replies ?? 0,
        media: mediaUrls,
        url: tweet.permanentUrl || `https://x.com/${profile.username}/status/${tweet.id}`,
      });

      batchCount++;
      if (batchCount >= 20) {
        pagesFetched++;
        batchCount = 0;
        onProgress?.(pagesFetched, posts.length);
      }
    }
  } catch (err: unknown) {
    console.error("Scraper tweets error:", err);
    if (posts.length === 0) {
      throw new TwitterApiError("Unable to retrieve posts. The account may be protected or rate-limited.");
    }
  }

  if (posts.length > 0 && batchCount > 0) {
    pagesFetched++;
    onProgress?.(pagesFetched, posts.length);
  }

  // Oldest tweet first (lowest to newest)
  posts.reverse();

  return {
    profile,
    posts,
  };
}
