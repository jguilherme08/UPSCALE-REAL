/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: '20mb' }
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        'sharp': 'commonjs sharp'
      });
    }
    return config;
  }
};

module.exports = nextConfig;
