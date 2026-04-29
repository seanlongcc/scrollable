import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  outputFileTracingIncludes: {
    "/api/url/resolve": [
      "./node_modules/youtube-dl-exec/bin/**/*",
      "../node_modules/youtube-dl-exec/bin/**/*",
    ],
  },
};

export default nextConfig;
