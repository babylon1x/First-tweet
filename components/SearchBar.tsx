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
          className="w-full px-4 py-3.5 rounded-full border border-neutral-800 bg-neutral-900 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-600 text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        aria-label={isLoading ? "Fetching Timeline" : "Fetch Posts"}
        className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:bg-neutral-300 text-neutral-950 font-medium text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-950 shrink-0 shadow-md"
      >
        {isLoading ? "Fetching Timeline..." : "Fetch Posts"}
      </button>
    </form>
  );
};
