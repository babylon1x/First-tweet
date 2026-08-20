import { Scraper } from "agent-twitter-client";
import { Tweet, UserProfile } from "@/types/tweet";

export class ScraperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScraperError";
  }
}

export async function scrapeProfileAndTweets(
  username: string,
  onProgress?: (pagesFetched: number, postsFetched: number) => void
): Promise<{ profile: UserProfile; posts: Tweet[] }> {
  const scraper = new Scraper();

  let profileData: Awaited<ReturnType<typeof scraper.getProfile>> | null = null;
  try {
    profileData = await scraper.getProfile(username);
  } catch (err: unknown) {
    const msg = String(err).toLowerCase();
    if (msg.includes("protected") || msg.includes("private")) {
      throw new ScraperError("This account is protected.");
    }
    if (msg.includes("suspended") || msg.includes("unavailable")) {
      throw new ScraperError("This account is unavailable.");
    }
    if (msg.includes("not found") || msg.includes("does not exist") || msg.includes("404")) {
      throw new ScraperError("Profile not found.");
    }
    throw new ScraperError("Unable to retrieve posts right now. Please try again.");
  }

  if (!profileData) {
    throw new ScraperError("Profile not found.");
  }

  // Safely check profile flags across scraper versions
  const profileRecord = profileData as unknown as Record<string, unknown>;
  const isProtected = Boolean(profileData.isPrivate || profileRecord.isProtected);
  const isSuspended = Boolean(profileRecord.isSuspended);

  if (isProtected) {
    throw new ScraperError("This account is protected.");
  }

  if (isSuspended) {
    throw new ScraperError("This account is unavailable.");
  }

  const profile: UserProfile = {
    id: profileData.userId || username,
    username: profileData.username || username,
    name: profileData.name || username,
  };

  const rawTweets: Tweet[] = [];
  let pagesFetched = 0;
  let currentBatchCount = 0;

  try {
    const tweetsGenerator = scraper.getTweets(username);

    for await (const t of tweetsGenerator) {
      if (!t || !t.id) continue;
      const tweetId: string = t.id;

      const media: string[] = [];
      if (t.photos && Array.isArray(t.photos)) {
        for (const photo of t.photos) {
          if (photo && photo.url) media.push(photo.url);
        }
      }
      if (t.videos && Array.isArray(t.videos)) {
        for (const video of t.videos) {
          if (video) {
            const vUrl = video.preview || video.url;
            if (vUrl) media.push(vUrl);
          }
        }
      }

      let createdAtStr = new Date().toISOString();
      if (t.timeParsed) {
        createdAtStr = new Date(t.timeParsed as unknown as string | number | Date).toISOString();
      } else if (t.timestamp) {
        createdAtStr = new Date(t.timestamp * 1000).toISOString();
      }

      const tweetUrl = typeof t.permanentUrl === "string" && t.permanentUrl ? t.permanentUrl : `https://x.com/${username}/status/${tweetId}`;

      rawTweets.push({
        id: tweetId,
        text: t.text || "",
        createdAt: createdAtStr,
        likes: typeof t.likes === "number" ? t.likes : 0,
        retweets: typeof t.retweets === "number" ? t.retweets : 0,
        replies: typeof t.replies === "number" ? t.replies : 0,
        media: media.length > 0 ? media : undefined,
        url: tweetUrl,
      });

      currentBatchCount++;
      if (currentBatchCount % 20 === 0) {
        pagesFetched += 1;
        if (onProgress) {
          onProgress(pagesFetched, rawTweets.length);
        }
      }
    }
  } catch (err: unknown) {
    const msg = String(err).toLowerCase();
    if (msg.includes("protected")) {
      throw new ScraperError("This account is protected.");
    }
    if (msg.includes("suspended")) {
      throw new ScraperError("This account is unavailable.");
    }
    if (rawTweets.length === 0) {
      throw new ScraperError("Unable to retrieve posts right now. Please try again.");
    }
  }

  if (onProgress && rawTweets.length > 0) {
    onProgress(Math.max(1, pagesFetched), rawTweets.length);
  }

  // Reverse tweets into chronological order (oldest -> newest)
  rawTweets.reverse();

  return {
    profile,
    posts: rawTweets,
  };
}
