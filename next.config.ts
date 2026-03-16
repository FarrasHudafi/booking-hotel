import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/api/payment/notification/:path*",
        headers: [
          {
            key: "access-control-allow-origin",
            value: "*",
          },
          {
            key: "access-control-allow-methods",
            value: "GET, POST",
          },
          {
            key: "access-control-allow-headers",
            value:
              "X-CRSF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "ujtybz23tuawcqkd.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
