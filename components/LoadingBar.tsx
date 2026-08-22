"use client";

import React from "react";

interface LoadingBarProps {
  pagesFetched: number;
  postsFetched: number;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({
  pagesFetched,
  postsFetched,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex flex-col gap-2 my-4 shadow-lg"
    >
      <div className="flex items-center justify-between text-sm text-neutral-300 font-medium">
        <span>
          {pagesFetched > 0 ? `Scraping page ${pagesFetched}` : "Connecting to X scraper..."}
        </span>
        <span>
          {postsFetched.toLocaleString()} {postsFetched === 1 ? "post" : "posts"} loaded
        </span>
      </div>
      <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-white h-full rounded-full transition-all duration-300 ease-out animate-pulse"
          style={{ width: pagesFetched > 0 ? "100%" : "30%" }}
        />
      </div>
    </div>
  );
};
