/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', 'api.university.io', 's7sai.cloud'],
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1') + '/:path*',
      },
    ]
  },
}

module.exports = nextConfig
