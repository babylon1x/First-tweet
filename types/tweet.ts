export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  media?: string[];
  url: string;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
}

export type StreamPayload =
  | {
      status: "loading";
      pagesFetched: number;
      postsFetched: number;
    }
  | {
      status: "complete";
      profile: UserProfile;
      posts: Tweet[];
    }
  | {
      status: "error";
      error: string;
      retryAfter?: number;
    };
