import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker compatibility
  output: 'standalone',
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization for Docker
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
