import { extractUsername } from "@/lib/extractUsername";
import { fetchProfileAndTweets, TwitterApiError } from "@/lib/twitter";
import { StreamPayload } from "@/types/tweet";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: StreamPayload) => {
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify(payload) + "\n")
          );
        } catch {
          // Client disconnected.
        }
      };

      try {
        let body: { profile?: string } | null = null;

        try {
          body = await request.json();
        } catch {
          send({
            status: "error",
            error: "Invalid request payload.",
          });

          controller.close();
          return;
        }

        if (!body?.profile?.trim()) {
          send({
            status: "error",
            error: "Please provide a valid X profile URL or username.",
          });

          controller.close();
          return;
        }

        const username = extractUsername(body.profile);

        if (!username) {
          send({
            status: "error",
            error: "Profile not found.",
          });

          controller.close();
          return;
        }

        // Initial loading state
        send({
          status: "loading",
          pagesFetched: 0,
          postsFetched: 0,
        });

        // Fetch profile and tweets from X API
        const { profile, posts } = await fetchProfileAndTweets(
          username,
          (pagesFetched: number, postsFetched: number) => {
            send({
              status: "loading",
              pagesFetched,
              postsFetched,
            });
          }
        );

        // Final response
        send({
          status: "complete",
          profile,
          posts,
        });
      } catch (err: unknown) {
        if (err instanceof TwitterApiError) {
          send({
            status: "error",
            error: err.message,
          });
        } else {
          console.error("Timeline API Error:", err);

          send({
            status: "error",
            error: "Unable to retrieve posts right now. Please try again.",
          });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Stream already closed.
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