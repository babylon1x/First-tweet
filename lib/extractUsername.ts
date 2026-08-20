/**
 * Extracts a clean, lowercase X (Twitter) username from various input formats:
 * - https://x.com/username
 * - https://x.com/username/
 * - https://x.com/username/status/123456
 * - https://twitter.com/username
 * - @username
 * - username
 */
export function extractUsername(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  let cleaned = input.trim();

  if (cleaned.includes("://") || cleaned.includes("x.com/") || cleaned.includes("twitter.com/")) {
    try {
      if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
        cleaned = "https://" + cleaned;
      }

      const url = new URL(cleaned);
      const pathname = url.pathname.replace(/^\/+/, "");
      const parts = pathname.split("/").filter(Boolean);

      if (parts.length > 0) {
        cleaned = parts[0];
      }
    } catch {
      const match = cleaned.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]{1,15})/i);
      if (match && match[1]) {
        cleaned = match[1];
      }
    }
  }

  if (cleaned.startsWith("@")) {
    cleaned = cleaned.slice(1);
  }

  cleaned = cleaned.split("?")[0].split("#")[0].trim();
  cleaned = cleaned.replace(/[^a-zA-Z0-9_]/g, "");

  return cleaned.toLowerCase();
}
