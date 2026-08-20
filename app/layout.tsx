import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "FirstTweet - View Any X Account's First Tweet",
  description:
    "Fetch and view any public X (Twitter) account's timeline in reverse chronological order starting from their first-ever post.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-neutral-100 text-neutral-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
