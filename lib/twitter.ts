import { Tweet, UserProfile } from "@/types/tweet";

export class TwitterApiError extends Error {
  public retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = "TwitterApiError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Step 1: Lookup user by username via X API v2
 * Endpoint: GET /2/users/by/username/:username
 */
export async function fetchUserId(
  username: string,
  bearerToken: string
): Promise<UserProfile> {
  const url = `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username,protected`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new TwitterApiError("Network failure. Please check your connection and try again.");
  }

  if (response.status === 402) {
    throw new TwitterApiError("X API credits depleted (402 Payment Required). Please check your X Developer account plan & credits at developer.x.com.");
  }

  if (response.status === 429) {
    const resetHeader = response.headers.get("x-rate-limit-reset");
    const retryHeader = response.headers.get("retry-after");
    let retryAfterSeconds: number | undefined;

    if (retryHeader) {
      retryAfterSeconds = parseInt(retryHeader, 10);
    } else if (resetHeader) {
      const resetTime = parseInt(resetHeader, 10) * 1000;
      retryAfterSeconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
    }

    throw new TwitterApiError("Rate limit reached. Please try again shortly.", retryAfterSeconds);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new TwitterApiError("Profile not found.");
    }
    throw new TwitterApiError("Failed to fetch user profile. Please try again.");
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    const err = data.errors[0];
    const detail = (err.detail || "").toLowerCase();
    const title = (err.title || "").toLowerCase();

    if (detail.includes("could not find") || title.includes("not found")) {
      throw new TwitterApiError("Profile not found.");
    }
    if (detail.includes("suspended") || title.includes("suspended")) {
      throw new TwitterApiError("This account is unavailable.");
    }
    if (detail.includes("protected") || title.includes("protected")) {
      throw new TwitterApiError("This account is protected and its posts cannot be accessed.");
    }
    throw new TwitterApiError("Profile not found.");
  }

  if (!data.data) {
    throw new TwitterApiError("Profile not found.");
  }

  if (data.data.protected) {
    throw new TwitterApiError("This account is protected and its posts cannot be accessed.");
  }

  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name,
  };
}

/**
 * Step 2: Fetch all public tweets for a user ID with pagination and reversal
 * Endpoint: GET /2/users/:id/tweets
 */
export async function fetchAllTweets(
  userId: string,
  bearerToken: string,
  onProgress?: (pagesFetched: number, postsFetched: number) => void
): Promise<Tweet[]> {
  const allTweets: Tweet[] = [];
  let paginationToken: string | undefined = undefined;
  let pagesFetched = 0;

  do {
    const params = new URLSearchParams({
      max_results: "100",
      "tweet.fields": "created_at,public_metrics,attachments,conversation_id,referenced_tweets",
    });

    if (paginationToken) {
      params.append("pagination_token", paginationToken);
    }

    const url = `https://api.x.com/2/users/${userId}/tweets?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        cache: "no-store",
      });
    } catch {
      throw new TwitterApiError("Network failure. Please check your connection and try again.");
    }

    if (response.status === 402) {
      throw new TwitterApiError("X API credits depleted (402 Payment Required). Please check your X Developer account plan & credits at developer.x.com.");
    }

    if (response.status === 429) {
      const resetHeader = response.headers.get("x-rate-limit-reset");
      const retryHeader = response.headers.get("retry-after");
      let retryAfterSeconds: number | undefined;

      if (retryHeader) {
        retryAfterSeconds = parseInt(retryHeader, 10);
      } else if (resetHeader) {
        const resetTime = parseInt(resetHeader, 10) * 1000;
        retryAfterSeconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
      }

      throw new TwitterApiError("Rate limit reached. Please try again shortly.", retryAfterSeconds);
    }

    if (response.status === 403) {
      throw new TwitterApiError("This account is protected and its posts cannot be accessed.");
    }

    if (!response.ok) {
      throw new TwitterApiError("Failed to fetch timeline posts. Please try again.");
    }

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      const err = data.errors[0];
      const detail = (err.detail || "").toLowerCase();
      if (detail.includes("protected")) {
        throw new TwitterApiError("This account is protected and its posts cannot be accessed.");
      }
      if (detail.includes("suspended")) {
        throw new TwitterApiError("This account is unavailable.");
      }
    }

    const pageTweets: Tweet[] = data.data || [];
    allTweets.push(...pageTweets);

    pagesFetched += 1;
    if (onProgress) {
      onProgress(pagesFetched, allTweets.length);
    }

    paginationToken = data.meta?.next_token;
  } while (paginationToken);

  // Reverse timeline into chronological order (oldest -> newest)
  allTweets.reverse();

  return allTweets;
}
