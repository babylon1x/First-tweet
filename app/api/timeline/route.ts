import { extractUsername } from "@/lib/extractUsername";
import { scrapeProfileAndTweets, ScraperError } from "@/lib/scraper";
import { StreamPayload } from "@/types/tweet";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: StreamPayload) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
        } catch {
          // Stream might be closed if client disconnected
        }
      };

      try {
        let body: { profile?: string } | null = null;
        try {
          body = await request.json();
        } catch {
          send({ status: "error", error: "Invalid request payload." });
          controller.close();
          return;
        }

        if (!body || !body.profile || typeof body.profile !== "string" || !body.profile.trim()) {
          send({ status: "error", error: "Please provide a valid X profile URL or username." });
          controller.close();
          return;
        }

        const username = extractUsername(body.profile);
        if (!username) {
          send({ status: "error", error: "Profile not found." });
          controller.close();
          return;
        }

        // Send initial loading state
        send({
          status: "loading",
          pagesFetched: 0,
          postsFetched: 0,
        });

        // Scrape user profile & public tweets
        const { profile, posts } = await scrapeProfileAndTweets(
          username,
          (pagesFetched, postsFetched) => {
            send({
              status: "loading",
              pagesFetched,
              postsFetched,
            });
          }
        );

        // Send completed timeline response
        send({
          status: "complete",
          profile,
          posts,
        });
      } catch (err: unknown) {
        if (err instanceof ScraperError) {
          send({
            status: "error",
            error: err.message,
          });
        } else {
          send({
            status: "error",
            error: "Unable to retrieve posts right now. Please try again.",
          });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
