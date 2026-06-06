import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@splinetool/react-spline'],
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
