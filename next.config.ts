import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow opening the dev server via the LAN IP (e.g. from a phone), not only localhost
  allowedDevOrigins: ["172.26.240.1"],
};

export default nextConfig;
