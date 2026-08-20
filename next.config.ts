import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["agent-twitter-client", "@roamhq/wrtc"],
};

export default nextConfig;
