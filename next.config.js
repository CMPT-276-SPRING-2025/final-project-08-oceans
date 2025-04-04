/** @type {import('next').NextConfig} */
const nextConfig = {
  
  experimental: {
    forceSwcTransforms: true,
  },
  
  reactStrictMode: true,
  
  compiler: {
    styledComponents: process.env.NODE_ENV === 'production'
  },

  images: {
    remotePatterns: [
      
      {
        protocol: 'https',
        hostname: 'dl5zpyw5k3jeb.cloudfront.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dbw3zep4prcju.cloudfront.net',
        port: '',
        pathname: '/**',
      }
    ]
  },
};

module.exports = nextConfig;
