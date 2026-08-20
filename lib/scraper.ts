import { Scraper } from "agent-twitter-client";
import { Tweet, UserProfile } from "@/types/tweet";

export class ScraperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScraperError";
  }
}

/**
 * Strategy 1: Official X API v2 fallback if X_BEARER_TOKEN is configured
 */
async function fetchViaXApiV2(
  username: string,
  bearerToken: string,
  onProgress?: (pagesFetched: number, postsFetched: number) => void
): Promise<{ profile: UserProfile; posts: Tweet[] }> {
  // Step 1: User Lookup
  const userUrl = `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username,protected`;
  let userRes: Response;
  try {
    userRes = await fetch(userUrl, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      cache: "no-store",
    });
  } catch {
    throw new ScraperError("Network failure. Please check your connection.");
  }

  if (userRes.status === 429) {
    throw new ScraperError("Rate limit reached on X API. Please try again shortly.");
  }

  if (!userRes.ok) {
    if (userRes.status === 404) throw new ScraperError("Profile not found.");
    throw new ScraperError("Failed to fetch profile from X API.");
  }

  const userData = await userRes.json();
  if (userData.errors && userData.errors.length > 0) {
    const err = userData.errors[0];
    const detail = (err.detail || "").toLowerCase();
    if (detail.includes("not find") || detail.includes("not found")) throw new ScraperError("Profile not found.");
    if (detail.includes("suspended")) throw new ScraperError("This account is unavailable.");
    if (detail.includes("protected")) throw new ScraperError("This account is protected.");
    throw new ScraperError("Profile not found.");
  }

  if (!userData.data) throw new ScraperError("Profile not found.");
  if (userData.data.protected) throw new ScraperError("This account is protected.");

  const profile: UserProfile = {
    id: userData.data.id,
    username: userData.data.username,
    name: userData.data.name,
  };

  // Step 2: Fetch Tweets Loop
  const allTweets: Tweet[] = [];
  let paginationToken: string | undefined = undefined;
  let pagesFetched = 0;

  do {
    const params = new URLSearchParams({
      max_results: "100",
      "tweet.fields": "created_at,public_metrics,attachments,conversation_id,referenced_tweets",
    });
    if (paginationToken) params.append("pagination_token", paginationToken);

    const tweetsUrl = `https://api.x.com/2/users/${profile.id}/tweets?${params.toString()}`;
    let tweetsRes: Response;
    try {
      tweetsRes = await fetch(tweetsUrl, {
        headers: { Authorization: `Bearer ${bearerToken}` },
        cache: "no-store",
      });
    } catch {
      throw new ScraperError("Network failure while fetching timeline.");
    }

    if (tweetsRes.status === 429) {
      throw new ScraperError("Rate limit reached on X API. Please try again shortly.");
    }

    if (!tweetsRes.ok) {
      throw new ScraperError("Failed to fetch timeline posts.");
    }

    const data = await tweetsRes.json();
    const pageTweets = data.data || [];

    for (const t of pageTweets) {
      allTweets.push({
        id: t.id,
        text: t.text || "",
        createdAt: t.created_at || new Date().toISOString(),
        likes: t.public_metrics?.like_count || 0,
        retweets: t.public_metrics?.retweet_count || 0,
        replies: t.public_metrics?.reply_count || 0,
        media: t.attachments?.media_keys,
        url: `https://x.com/${profile.username}/status/${t.id}`,
      });
    }

    pagesFetched++;
    if (onProgress) onProgress(pagesFetched, allTweets.length);

    paginationToken = data.meta?.next_token;
  } while (paginationToken);

  // Reverse timeline into chronological order (oldest -> newest)
  allTweets.reverse();

  return { profile, posts: allTweets };
}

/**
 * Main scraper entry point supporting:
 * 1. Official X API v2 (if X_BEARER_TOKEN is set)
 * 2. Authenticated Cookie Scraper (if TWITTER_COOKIES or TWITTER_AUTH_TOKEN is set)
 * 3. Public Scraper Fallback
 */
export async function scrapeProfileAndTweets(
  username: string,
  onProgress?: (pagesFetched: number, postsFetched: number) => void
): Promise<{ profile: UserProfile; posts: Tweet[] }> {
  // Strategy 1: Official X API v2 if bearer token is configured
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (bearerToken && bearerToken.trim()) {
    return fetchViaXApiV2(username, bearerToken.trim(), onProgress);
  }

  // Strategy 2: Scraper with cookies or guest session
  const scraper = new Scraper();

  const cookiesEnv = process.env.TWITTER_COOKIES;
  const authTokenEnv = process.env.TWITTER_AUTH_TOKEN;
  const ct0Env = process.env.TWITTER_CT0;

  if (cookiesEnv) {
    const cookieArray = cookiesEnv.split(";").map((c) => c.trim()).filter(Boolean);
    await scraper.setCookies(cookieArray);
  } else if (authTokenEnv) {
    const cookieArray = [
      `auth_token=${authTokenEnv}; Path=/; Domain=.twitter.com; Secure; HTTPOnly`,
    ];
    if (ct0Env) {
      cookieArray.push(`ct0=${ct0Env}; Path=/; Domain=.twitter.com; Secure`);
    }
    await scraper.setCookies(cookieArray);
  }

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
    if (msg.includes("34") || msg.includes("does not exist") || msg.includes("not found") || msg.includes("404")) {
      throw new ScraperError(
        "Profile not found or X restricted unauthenticated guest access. Please add TWITTER_COOKIES or X_BEARER_TOKEN to your environment."
      );
    }
    throw new ScraperError("Unable to retrieve posts right now. Please try again.");
  }

  if (!profileData) {
    throw new ScraperError("Profile not found.");
  }

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
        if (onProgress) onProgress(pagesFetched, rawTweets.length);
      }
    }
  } catch (err: unknown) {
    const msg = String(err).toLowerCase();
    if (msg.includes("protected")) throw new ScraperError("This account is protected.");
    if (msg.includes("suspended")) throw new ScraperError("This account is unavailable.");
    if (rawTweets.length === 0) {
      throw new ScraperError("Unable to retrieve posts right now. Please try again.");
    }
  }

  if (onProgress && rawTweets.length > 0) {
    onProgress(Math.max(1, pagesFetched), rawTweets.length);
  }

  // Reverse tweets into chronological order (oldest -> newest)
  rawTweets.reverse();

  return { profile, posts: rawTweets };
}
