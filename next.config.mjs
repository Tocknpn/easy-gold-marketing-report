/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const isExport = isProd || process.env.NEXT_EXPORT === 'true';

const nextConfig = {
  // Only statically export in production build for Cloudflare Workers Static Assets
  // In development (`next dev`), keep output unconstrained so all API routes and middleware run smoothly
  ...(isExport ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
