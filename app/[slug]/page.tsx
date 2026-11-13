import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { basePath, metadataBase, siteImage, siteTitle } from '@/app/siteMetadata';
import NotionPage from '@/components/notion/NotionPage';
import type { NotionBlock, PostMeta } from '@/components/notion/types';
import type { ExtendedRecordMap } from 'notion-types';

interface PageProps {
    params: Promise<{ slug: string }>;
}

function isBlockContent(value: unknown): value is { blocks: NotionBlock[] } {
    return typeof value === 'object'
        && value !== null
        && 'blocks' in value
        && Array.isArray(value.blocks);
}

function isRecordMap(value: unknown): value is ExtendedRecordMap {
    return typeof value === 'object'
        && value !== null
        && 'block' in value
        && typeof value.block === 'object'
        && value.block !== null;
}

export async function generateStaticParams() {
    const idxPath = path.join(process.cwd(), 'data', 'index.json');
    const posts: { slug: string }[] = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const { slug } = await props.params;
    const idxPath = path.join(process.cwd(), 'data', 'index.json');
    const posts: PostMeta[] = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    const meta = posts.find((post) => post.slug === slug);
    if (!meta) throw new Error(`Post metadata not found for slug: ${slug}`);

    const canonicalPath = `${basePath}/${slug}/`.replace(/\/+/g, '/');
    const image = meta.hero ? { url: meta.hero, alt: meta.title } : undefined;

    return {
        metadataBase,
        title: `${meta.title} | ${siteTitle}`,
        description: meta.summary,
        keywords: meta.tags,
        authors: [{ name: 'Arjun Kalburgi' }],
        alternates: {
            canonical: canonicalPath,
        },
        icons: {
            icon: [{ url: siteImage, type: 'image/svg+xml' }],
        },
        openGraph: {
            type: 'article',
            url: canonicalPath,
            title: meta.title,
            description: meta.summary,
            siteName: siteTitle,
            publishedTime: meta.date,
            section: meta.contentType?.[0],
            tags: meta.tags,
            images: image ? [image] : undefined,
        },
        twitter: {
            card: image ? 'summary_large_image' : 'summary',
            title: meta.title,
            description: meta.summary,
            images: image ? [image] : undefined,
        },
    };
}

export default async function PostPage(props: PageProps) {
    const { slug } = await props.params;
    
    // Read metadata
    const idxPath = path.join(process.cwd(), "data", "index.json");
    const posts: PostMeta[] = JSON.parse(fs.readFileSync(idxPath, "utf8"));
    const meta = posts.find((p) => p.slug === slug);
    if (!meta) throw new Error(`Post metadata not found for slug: ${slug}`);
    
    const file = path.join(process.cwd(), 'data', 'posts', `${slug}.json`);
    const content: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (isBlockContent(content)) {
        return <NotionPage blocks={content.blocks} meta={meta} />;
    }
    if (isRecordMap(content)) {
        return <NotionPage recordMap={content} meta={meta} />;
    }
    throw new Error(`Notion content has an unsupported format for slug: ${slug}`);
}
