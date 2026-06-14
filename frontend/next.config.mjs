/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.eduhub.co.mz' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },
  async rewrites() {
    // API_URL = internal Docker URL (baked at build time by Dockerfile ENV)
    // Fallback for local dev without Docker
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'
    return [
      { source: '/api/:path*', destination: `${apiUrl}/:path*` },
    ]
  },
}

export default nextConfig
