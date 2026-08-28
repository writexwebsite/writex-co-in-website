/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  images: {
    // Avoid Next's internal refetch of local assets on the isolated demo listener.
    // The normal production build keeps the optimized-image path unchanged.
    unoptimized: process.env.MY_WRITEX_DEMO_MODE === "true",
    formats: ["image/avif", "image/webp"]
  },
  async redirects() {
    return [
      {
        source: "/countries/:path*",
        destination: "/about-us",
        permanent: true
      },
      {
        source: "/subjects/:path*",
        destination: "/assignment-support",
        permanent: true
      },
      {
        source: "/refund",
        destination: "/terms#payment-cancellation-revisions-disputes",
        permanent: true
      },
      {
        source: "/refund-policy",
        destination: "/terms#payment-cancellation-revisions-disputes",
        permanent: true
      },
      {
        source: "/help-centre",
        destination: "/help",
        permanent: true
      },
      {
        source: "/help-centre/:path*",
        destination: "/help/:path*",
        permanent: true
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'"
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }
        ]
      }
    ];
  }
};

export default nextConfig;
