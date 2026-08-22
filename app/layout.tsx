import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "FirstTweet - View Any X Account's First Tweet",
  description:
    "Fetch and view any public X (Twitter) account's timeline in chronological order starting from their first-ever post.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen antialiased selection:bg-neutral-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
