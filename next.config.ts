import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Cloudflare (OpenNext) only: exposes Cloudflare bindings to `next dev` via a
// local wrangler/miniflare instance. Skipped on Vercel, which runs Next.js
// natively (see docs/DEPLOY-VERCEL.md), and when DEPLOY_TARGET=vercel locally.
if (!process.env.VERCEL && process.env.DEPLOY_TARGET !== "vercel") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
