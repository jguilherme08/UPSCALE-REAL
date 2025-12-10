/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: '20mb' }
  }
};

module.exports = nextConfig;
