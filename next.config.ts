import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove static export for development to allow API calls
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  experimental: {
    esmExternals: true
  },
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:8787/:path*'
      },
      {
        source: '/api/research',
        destination: 'http://localhost:8788/research'
      },
      {
        source: '/api/research/',
        destination: 'http://localhost:8788/research'
      },
      {
        source: '/api/research/:path*',
        destination: 'http://localhost:8788/:path*'
      }
    ];
  }
};

export default nextConfig;
