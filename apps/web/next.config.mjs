/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@refidim/database", "@refidim/shared"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // permite upload de CSV
    },
  },
};

export default nextConfig;
