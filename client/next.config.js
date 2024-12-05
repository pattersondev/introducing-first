/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['introducing-first-fighter-images.s3.amazonaws.com'],
  },
  scripts: {
    domains: ['pagead2.googlesyndication.com', 'googleads.g.doubleclick.net'],
  },
}

module.exports = nextConfig
