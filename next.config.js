/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { isServer }) => {
    // Suppress watchpack warnings
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/System Volume Information/**', '**/node_modules/**', '**/.git/**'],
      };
    }

    // Configure SVG as React components
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
}

module.exports = nextConfig
