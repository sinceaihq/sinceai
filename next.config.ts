import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import {
  GUIDE_HEADER_SOURCES,
  GUIDE_X_ROBOTS_TAG,
} from "./lib/hackathon-2026/route";

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const revalidateOnEveryRequestHeader = {
  key: 'Cache-Control',
  value: 'public, max-age=0, must-revalidate',
};

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [...securityHeaders, revalidateOnEveryRequestHeader],
      },
      // Hackathon 2026 Field Guide: shareable by direct link, never indexed.
      ...GUIDE_HEADER_SOURCES.map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: GUIDE_X_ROBOTS_TAG }],
      })),
    ];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
