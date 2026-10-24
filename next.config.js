/**
 * Static export configuration for GitHub Pages.
 *
 * - User/org root site (<user>.github.io): leave NEXT_PUBLIC_BASE_PATH unset.
 * - Project site (<user>.github.io/<repo>): set NEXT_PUBLIC_BASE_PATH=/<repo>.
 *
 * @type {import('next').NextConfig}
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  reactStrictMode: true,
};

module.exports = nextConfig;
