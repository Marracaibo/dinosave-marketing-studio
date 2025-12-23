/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Usa variabile d'ambiente per il backend URL (Render in produzione, localhost in dev)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/assets/:path*',
        destination: `${backendUrl}/assets/:path*`,
      },
      {
        source: '/output/:path*',
        destination: `${backendUrl}/output/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
