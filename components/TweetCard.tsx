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
    <article className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 transition-colors flex flex-col gap-3 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <time
          dateTime={tweet.createdAt}
          className="text-xs font-medium text-neutral-400 uppercase tracking-wider"
        >
          {formattedDate}
        </time>
        {hasMedia && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
            Media Attached
          </span>
        )}
      </div>

      <p className="text-neutral-100 text-base leading-relaxed whitespace-pre-wrap break-words">
        {tweet.text}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
        <div className="flex items-center gap-5 text-xs text-neutral-400">
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

        {tweet.url && (
          <a
            href={tweet.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-neutral-400 hover:text-white transition-colors underline underline-offset-4"
          >
            View on X ↗
          </a>
        )}
      </div>
    </article>
  );
});
