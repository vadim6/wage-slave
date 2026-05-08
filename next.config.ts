import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer', '@prisma/client', 'prisma'],
  allowedDevOrigins: ['192.168.1.25'],
}

export default nextConfig
