import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // reactCompiler disabled — causes OOM during route compilation on first page load
  // heap reaches 3.5GB+ compiling / with full Babel dataflow analysis across all components
  // re-enable only after profiling memory during compile
  // reactCompiler: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
};

export default nextConfig;
