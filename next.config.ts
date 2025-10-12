import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3-us-west-2.amazonaws.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "public.notion-static.com",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
