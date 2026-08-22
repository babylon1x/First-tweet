"use client";

import React, { useState, FormEvent } from "react";
import { SearchBar } from "@/components/SearchBar";
import { LoadingBar } from "@/components/LoadingBar";
import { Timeline } from "@/components/Timeline";
import { StreamPayload, Tweet, UserProfile } from "@/types/tweet";

type AppState = "idle" | "loading" | "complete" | "error";

export default function HomePage() {
  const [profileInput, setProfileInput] = useState<string>("");
  const [status, setStatus] = useState<AppState>("idle");
  const [pagesFetched, setPagesFetched] = useState<number>(0);
  const [postsFetched, setPostsFetched] = useState<number>(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Tweet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleFetch = async (e: FormEvent) => {
    e.preventDefault();
    if (!profileInput.trim() || status === "loading") return;

    setStatus("loading");
    setPagesFetched(0);
    setPostsFetched(0);
    setProfile(null);
    setPosts([]);
    setErrorMessage("");

    try {
      const response = await fetch("/api/timeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile: profileInput }),
      });

      if (!response.ok) {
        setStatus("error");
        setErrorMessage("Server error occurred while requesting timeline.");
        return;
      }

      if (!response.body) {
        setStatus("error");
        setErrorMessage("Browser streaming is not supported.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const payload: StreamPayload = JSON.parse(trimmed);

            if (payload.status === "loading") {
              setPagesFetched(payload.pagesFetched);
              setPostsFetched(payload.postsFetched);
            } else if (payload.status === "complete") {
              setProfile(payload.profile);
              setPosts(payload.posts);
              setStatus("complete");
            } else if (payload.status === "error") {
              setErrorMessage(payload.error);
              setStatus("error");
            }
          } catch {
            // Ignore malformed JSON chunks
          }
        }
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network failure. Please check your connection and try again.");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-[760px] flex flex-col items-center gap-6">
        {/* Header Branding */}
        <header className="text-center flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            FirstTweet
          </h1>
          <p className="text-neutral-400 text-base max-w-md mx-auto">
            Scrape and view any X profile&apos;s posts starting from their first-ever tweet.
          </p>
        </header>

        {/* Search Bar Input */}
        <div className="w-full">
          <SearchBar
            value={profileInput}
            onChange={setProfileInput}
            onSubmit={handleFetch}
            isLoading={status === "loading"}
          />
        </div>

        {/* Loading Progress Indicator */}
        {status === "loading" && (
          <div className="w-full">
            <LoadingBar
              pagesFetched={pagesFetched}
              postsFetched={postsFetched}
            />
          </div>
        )}

        {/* Error Alert Message */}
        {status === "error" && errorMessage && (
          <div
            role="alert"
            className="w-full p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-red-400 text-sm flex items-center justify-between shadow-lg"
          >
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Completed Timeline Display */}
        {status === "complete" && profile && (
          <Timeline profile={profile} posts={posts} />
        )}
      </div>
    </main>
  );
}
