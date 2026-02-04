import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Desarrollo local
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '4000',
        pathname: '/uploads/**',
      },
      // Producción - cualquier host HTTPS
      {
        protocol: 'https',
        hostname: '**',
      },
      // Producción - cualquier host HTTP (para dominios internos)
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
    // Desactivar optimización para evitar problemas con URLs dinámicas
    unoptimized: true,
  },
};

export default nextConfig;
