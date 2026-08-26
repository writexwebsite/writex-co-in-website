const isDevelopment = process.env.NODE_ENV === "development";
const scriptPolicy = `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  ...(isDevelopment ? { allowedDevOrigins: ["127.0.0.1", "localhost"] } : {}),
  experimental: {
    proxyClientMaxBodySize: "82mb"
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [480, 768, 960, 1280, 1536, 1920, 2560, 3840, 5120, 7680],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    localPatterns: [
      {
        pathname: "/images/**"
      },
      {
        pathname: "/api/website-experience/assets/**"
      }
    ],
    minimumCacheTTL: 300
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
        source: "/festival-assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800"
          }
        ]
      },
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
            value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; ${scriptPolicy}; connect-src 'self'`
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }
        ]
      }
    ];
  }
};

export default nextConfig;
