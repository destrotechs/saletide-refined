import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Skip type checking during build (types should be checked separately)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build (linting should be done separately)
    ignoreDuringBuilds: true,
  },
  // Disable static page generation for dynamic routes
  output: 'standalone',
};

export default nextConfig;
