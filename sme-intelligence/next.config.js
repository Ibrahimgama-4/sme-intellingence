/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '10mb' } // allow CSV/XLSX uploads up to 10MB
  }
};

module.exports = nextConfig;
