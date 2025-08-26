/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence warnings from specific packages
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },

  // Prevent ESLint errors from blocking builds
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
