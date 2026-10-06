import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kalpak/ui', '@kalpak/types', '@kalpak/validation'],
  async rewrites() {
    let apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
    // If Render blueprint provided the internal service name "kalpak-api", map to public HTTPS URL
    if (
      apiBase === 'kalpak-api' ||
      apiBase === 'http://kalpak-api' ||
      apiBase === 'https://kalpak-api' ||
      (apiBase.includes('kalpak-api') && !apiBase.includes('.onrender.com'))
    ) {
      apiBase = 'https://kalpak-api.onrender.com';
    }
    if (!apiBase.startsWith('http://') && !apiBase.startsWith('https://')) {
      apiBase = apiBase.includes('onrender.com') || !apiBase.includes(':')
        ? `https://${apiBase}`
        : `http://${apiBase}`;
    }
    // Remove trailing slash if present
    apiBase = apiBase.replace(/\/+$/, '');

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
