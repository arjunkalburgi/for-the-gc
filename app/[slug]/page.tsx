import fs from 'node:fs';
import path from 'node:path';
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
