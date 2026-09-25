/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy API calls to the backend in development to avoid CORS setup friction.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
