"use client";

import React, { memo } from "react";
import { Tweet } from "@/types/tweet";

interface TweetCardProps {
  tweet: Tweet;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatMetric(count?: number): string {
  if (count === undefined || count === null) return "0";
  return count.toLocaleString("en-US");
}

export const TweetCard = memo<TweetCardProps>(function TweetCard({ tweet }) {
  const hasMedia = Boolean(tweet.media && tweet.media.length > 0);
  const formattedDate = formatDate(tweet.createdAt);

  return (
    <article className="p-5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-colors flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <time
          dateTime={tweet.createdAt}
          className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
        >
          {formattedDate}
        </time>
        {hasMedia && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
            Media Attached
          </span>
        )}
      </div>

      <p className="text-neutral-900 text-base leading-relaxed whitespace-pre-wrap break-words">
        {tweet.text}
      </p>

      <div className="flex items-center gap-5 text-xs text-neutral-500 pt-1 border-t border-neutral-100">
        <span title="Replies" className="flex items-center gap-1">
          <span>💬</span>
          <span>{formatMetric(tweet.replies)}</span>
        </span>
        <span title="Reposts" className="flex items-center gap-1">
          <span>🔁</span>
          <span>{formatMetric(tweet.retweets)}</span>
        </span>
        <span title="Likes" className="flex items-center gap-1">
          <span>❤</span>
          <span>{formatMetric(tweet.likes)}</span>
        </span>
      </div>
    </article>
  );
});
