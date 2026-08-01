import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server's /_next/* chunks + HMR to be loaded when the app is
  // reached through a Cloudflare quick tunnel (random *.trycloudflare.com URL).
  // Without this, Next.js blocks those assets as cross-origin in dev, so the
  // client bundle never hydrates and JS-driven animations don't run.
  // Dev-only; has no effect on production (Vercel / CF Pages).
  // Add your own named-tunnel/custom domain here too if you use one.
  allowedDevOrigins: ["*.trycloudflare.com", "trycloudflare.com"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default nextConfig;
