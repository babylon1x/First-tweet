"use client";

import React, { FormEvent } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      aria-label="X Profile Search Form"
      className="w-full flex flex-col sm:flex-row gap-3"
    >
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste an X profile URL or @username"
          autoFocus
          disabled={isLoading}
          aria-label="X profile URL or username"
          className="w-full px-4 py-3.5 rounded-full border border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent focus:bg-white text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        aria-label={isLoading ? "Fetching Timeline" : "Fetch Posts"}
        className="px-7 py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white font-medium text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 shrink-0"
      >
        {isLoading ? "Fetching Timeline..." : "Fetch Posts"}
      </button>
    </form>
  );
};
