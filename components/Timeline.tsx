"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tweet, UserProfile } from "@/types/tweet";
import { TweetCard } from "@/components/TweetCard";

interface TimelineProps {
  profile: UserProfile;
  posts: Tweet[];
}

const BATCH_SIZE = 20;

function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
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

export const Timeline: React.FC<TimelineProps> = ({ profile, posts }) => {
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const firstPostDate = formatDate(posts[0]?.createdAt);
  const latestPostDate = formatDate(posts[posts.length - 1]?.createdAt);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [posts]);

  useEffect(() => {
    const target = observerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, posts.length));
        }
      },
      {
        rootMargin: "300px",
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [posts.length]);

  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  return (
    <div className="w-full flex flex-col gap-6 mt-4">
      {/* Timeline Header */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur flex flex-col gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white">{profile.name}</h2>
          <p className="text-sm text-neutral-400 font-mono">@{profile.username}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-neutral-800 text-center sm:text-left">
          <div>
            <span className="block text-xs text-neutral-400 font-medium uppercase tracking-wider">
              Total Posts
            </span>
            <span className="text-lg font-bold text-white">
              {posts.length.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block text-xs text-neutral-400 font-medium uppercase tracking-wider">
              First Post
            </span>
            <span className="text-sm font-semibold text-neutral-200">
              {firstPostDate}
            </span>
          </div>
          <div>
            <span className="block text-xs text-neutral-400 font-medium uppercase tracking-wider">
              Latest Post
            </span>
            <span className="text-sm font-semibold text-neutral-200">
              {latestPostDate}
            </span>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="flex flex-col gap-4">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/50">
            No public posts found for this profile.
          </div>
        ) : (
          visiblePosts.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)
        )}
      </div>

      {/* Infinite Scroll Sentinel */}
      {hasMore && (
        <div
          ref={observerRef}
          className="py-6 text-center text-sm text-neutral-500 font-medium"
        >
          Loading more posts... ({visibleCount} of {posts.length})
        </div>
      )}
    </div>
  );
};
