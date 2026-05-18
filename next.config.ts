import type { NextConfig } from "next"

const assetsUrl = new URL(
  process.env.NEXT_PUBLIC_ASSETS_URL || "https://assets.sepehrshapouri.com"
)

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  transpilePackages: ["next-mdx-remote"],
  allowedDevOrigins: ["ncdai.localhost", "ncdai.local"],
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: assetsUrl.protocol.replace(":", "") as "http" | "https",
        hostname: assetsUrl.hostname,
        port: assetsUrl.port,
      },
      {
        protocol: "https",
        hostname: "assets.sepehrshapouri.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
      },
    ],
    qualities: [75, 100],
  },
  compiler:
    process.env.NODE_ENV === "production"
      ? {
          removeConsole: {
            exclude: ["error"],
          },
        }
      : undefined,
  async redirects() {
    return [
      {
        source: "/:section(blog|components)/writing-effect-inspired-by-apple",
        destination: "/:section/apple-hello-effect",
        permanent: true,
      },
      {
        source: "/:section(blog|components)/work-experience",
        destination: "/:section/work-experience-component",
        permanent: true,
      },
      {
        source: "/:section(blog|components)/theme-switcher-component",
        destination: "/:section/theme-switcher",
        permanent: true,
      },
      {
        source: "/wall-of-love",
        destination: "/testimonials",
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/:section(blog|components)/:slug.mdx",
        destination: "/doc.mdx/:slug",
      },
      {
        source: "/:section(blog|components)/:slug",
        destination: "/doc.mdx/:slug",
        has: [
          {
            type: "header",
            key: "accept",
            value: "(?<accept>.*text/markdown.*)",
          },
        ],
      },
      {
        source: "/rss",
        destination: "/blog/rss",
      },
      {
        source: "/registry/rss",
        destination: "/components/rss",
      },
    ]
  },
}

export default nextConfig
