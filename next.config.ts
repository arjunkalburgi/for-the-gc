import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = (phase: string): NextConfig => {
    const dev = phase === PHASE_DEVELOPMENT_SERVER;
    const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
    const base = dev || !repositoryName ? '' : `/${repositoryName}`;
    
    return {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
        basePath: base || undefined,
        assetPrefix: base || undefined,
        env: {
            NEXT_PUBLIC_BASE_PATH: base,
        },
    };
};

export default nextConfig;
