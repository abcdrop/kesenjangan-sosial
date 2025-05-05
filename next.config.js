/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'raw.githubusercontent.com'],
  },
};

module.exports = nextConfig;
