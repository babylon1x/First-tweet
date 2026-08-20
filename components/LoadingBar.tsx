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
      className="w-full bg-neutral-100 rounded-lg p-4 border border-neutral-200 flex flex-col gap-2 my-4"
    >
      <div className="flex items-center justify-between text-sm text-neutral-700 font-medium">
        <span>
          {pagesFetched > 0 ? `Fetching page ${pagesFetched}` : "Connecting to X API..."}
        </span>
        <span>
          {postsFetched.toLocaleString()} {postsFetched === 1 ? "post" : "posts"} loaded
        </span>
      </div>
      <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-neutral-800 h-full rounded-full transition-all duration-300 ease-out animate-pulse"
          style={{ width: pagesFetched > 0 ? "100%" : "30%" }}
        />
      </div>
    </div>
  );
};
