import type { NextConfig } from "next";

/**
 * Conservative security headers. A full Content-Security-Policy is deliberately
 * not set here: Next.js dev mode and the print stylesheet need inline styles,
 * and an untested CSP can silently break the UI. This is documented as future
 * work instead of being claimed as complete.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  // SAMEORIGIN keeps same-origin iframe previews working while blocking
  // cross-origin framing.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pdfjs-dist (used by pdf-parse) resolves its worker relative to its own
  // package directory. Bundling it into .next/server breaks that lookup, so it
  // must stay external and be required from node_modules at runtime.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Analysis responses contain user-supplied offer text and must never be
        // stored by a shared cache or the browser HTTP cache.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
