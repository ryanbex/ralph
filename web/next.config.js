/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ralph-web/types"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/u/**",
      },
    ],
  },
};

module.exports = nextConfig;
