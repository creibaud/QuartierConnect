import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/aide',
  images: { unoptimized: true },
  skipTrailingSlashRedirect: true,
};

const withMDX = createMDX();
export default withMDX(config);
