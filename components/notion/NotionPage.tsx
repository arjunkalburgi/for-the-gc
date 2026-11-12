'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { NotionRenderer } from 'react-notion-x';
import type { ExtendedRecordMap } from 'notion-types';
import 'react-notion-x/src/styles.css';
import './NotionPage.css';
import type { NotionBlock, NotionRichText, PostMeta } from '@/components/notion/types';
import { formatDate } from '@/components/utls';

const Code = dynamic(() =>
    import('react-notion-x/build/third-party/code').then(m => m.Code)
);
const Collection = dynamic(() =>
    import('react-notion-x/build/third-party/collection').then(m => m.Collection)
);
const Equation = dynamic(() =>
    import('react-notion-x/build/third-party/equation').then(m => m.Equation)
);
const Modal = dynamic(
    () => import('react-notion-x/build/third-party/modal').then(m => m.Modal),
    { ssr: false }
);

function NullComponent() {
    return null;
}

type BlockContent = {
    rich_text?: NotionRichText[];
    title?: string | NotionRichText[];
    caption?: NotionRichText[];
    file?: { url?: string };
    external?: { url?: string };
    language?: string;
    checked?: boolean;
    icon?: { type?: string; emoji?: string };
    url?: string;
    expression?: string;
    cells?: NotionRichText[][];
    table_width?: number;
    has_column_header?: boolean;
    has_row_header?: boolean;
};

function getContent(block: NotionBlock): BlockContent {
    const content = block[block.type];
    return content && typeof content === 'object' ? content as BlockContent : {};
}

function getRichText(block: NotionBlock): NotionRichText[] {
    const content = getContent(block);
    if (content.rich_text) return content.rich_text;
    return Array.isArray(content.title) ? content.title : [];
}

function getText(block: NotionBlock): string {
    return getRichText(block).map(item =>
        item.plain_text || item.text?.content || item.equation?.expression || ''
    ).join('');
}

function getHref(item: NotionRichText): string | undefined {
    return item.href || item.text?.link?.url || undefined;
}

function getTextStyle(item: NotionRichText): CSSProperties {
    const annotations = item.annotations;
    const style: CSSProperties = {};
    if (annotations?.bold) style.fontWeight = 700;
    if (annotations?.italic) style.fontStyle = 'italic';
    const decorations = [
        annotations?.underline ? 'underline' : '',
        annotations?.strikethrough ? 'line-through' : '',
    ].filter(Boolean);
    if (decorations.length) style.textDecoration = decorations.join(' ');

    const color = annotations?.color;
    if (color && color !== 'default') {
        const colors: Record<string, string> = {
            gray: '#787774',
            brown: '#9f6b53',
            orange: '#d9730d',
            yellow: '#cb912f',
            green: '#448361',
            blue: '#337ea9',
            purple: '#9065b0',
            pink: '#c14c8a',
            red: '#d44c47',
        };
        const baseColor = color.replace('_background', '');
        if (colors[baseColor]) style.color = colors[baseColor];
        if (color.endsWith('_background')) {
            style.backgroundColor = `${colors[baseColor] || '#e9e9e7'}33`;
        }
    }

    return style;
}

function renderRichText(items: NotionRichText[], keyPrefix: string): ReactNode {
    return items.map((item, index) => {
        const text = item.plain_text || item.text?.content || item.equation?.expression || '';
        const key = `${keyPrefix}-${index}`;
        const content = item.annotations?.code
            ? <code>{text}</code>
            : <span style={getTextStyle(item)}>{text}</span>;
        const href = getHref(item);
        return href
            ? <a key={key} href={href}>{content}</a>
            : <span key={key}>{content}</span>;
    });
}

function getBlockUrl(block: NotionBlock): string | undefined {
    const content = getContent(block);
    return content.file?.url || content.external?.url || content.url;
}

function getCaption(block: NotionBlock, keyPrefix: string): ReactNode {
    return getContent(block).caption?.length
        ? <figcaption>{renderRichText(getContent(block).caption || [], keyPrefix)}</figcaption>
        : null;
}

function collectHeadings(blocks: NotionBlock[]): NotionBlock[] {
    return blocks.flatMap(block => [
        ...(['heading_1', 'heading_2', 'heading_3'].includes(block.type) ? [block] : []),
        ...(block.children ? collectHeadings(block.children) : []),
    ]);
}

function TableOfContents({ blocks }: { blocks: NotionBlock[] }) {
    const headings = collectHeadings(blocks);
    if (!headings.length) return null;

    return (
        <nav className="table-of-contents" aria-label="Table of contents">
            <ul>
                {headings.map(heading => (
                    <li key={heading.id} className={`table-of-contents__item--${heading.type}`}>
                        <a href={`#${heading.id}`}>{getText(heading)}</a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

function renderBlock(block: NotionBlock, allBlocks: NotionBlock[]): ReactNode {
    const content = getContent(block);
    const richText = getRichText(block);
    const text = renderRichText(richText, block.id);
    const children = block.children?.length
        ? renderBlocks(block.children, allBlocks)
        : null;

    switch (block.type) {
        case 'paragraph':
            return <div key={block.id}><p>{text}</p>{children}</div>;
        case 'heading_1':
            return <h2 id={block.id} key={block.id}>{text}</h2>;
        case 'heading_2':
            return <h3 id={block.id} key={block.id}>{text}</h3>;
        case 'heading_3':
            return <h4 id={block.id} key={block.id}>{text}</h4>;
        case 'to_do':
            return (
                <div key={block.id}>
                    <label>
                        <input type="checkbox" checked={content.checked || false} readOnly /> {text}
                    </label>
                    {children}
                </div>
            );
        case 'toggle':
            return <details key={block.id}><summary>{text}</summary>{children}</details>;
        case 'callout':
            return (
                <aside key={block.id}>
                    {content.icon?.emoji ? <span aria-hidden="true">{content.icon.emoji} </span> : null}
                    {text}
                    {children}
                </aside>
            );
        case 'quote':
            return <blockquote key={block.id}>{text}{children}</blockquote>;
        case 'code':
            return (
                <pre key={block.id}>
                    <code className={content.language ? `language-${content.language}` : undefined}>
                        {getText(block)}
                    </code>
                    {getCaption(block, block.id)}
                </pre>
            );
        case 'image': {
            const url = getBlockUrl(block);
            return url ? (
                <figure key={block.id}>
                    <Image
                        src={url}
                        alt={getContent(block).caption?.map(item => item.plain_text || '').join(' ') || ''}
                        width={1200}
                        height={800}
                        unoptimized
                        style={{ width: '100%', height: 'auto' }}
                    />
                    {getCaption(block, block.id)}
                </figure>
            ) : null;
        }
        case 'video': {
            const url = getBlockUrl(block);
            return url ? <figure key={block.id}><video controls src={url} />{getCaption(block, block.id)}</figure> : null;
        }
        case 'audio': {
            const url = getBlockUrl(block);
            return url ? <figure key={block.id}><audio controls src={url} />{getCaption(block, block.id)}</figure> : null;
        }
        case 'file':
        case 'pdf': {
            const url = getBlockUrl(block);
            return url ? (
                <figure key={block.id}>
                    <a href={url}>{getText(block) || 'Open attached file'}</a>
                    {getCaption(block, block.id)}
                </figure>
            ) : null;
        }
        case 'bookmark':
        case 'embed':
        case 'link_preview': {
            const url = getBlockUrl(block);
            return url ? <p key={block.id}><a href={url}>{getText(block) || url}</a>{children}</p> : null;
        }
        case 'table_of_contents':
            return <TableOfContents key={block.id} blocks={allBlocks} />;
        case 'divider':
            return <hr key={block.id} />;
        case 'equation':
            return <p key={block.id}>{content.expression || ''}</p>;
        case 'table': {
            const rows = block.children || [];
            return (
                <table key={block.id}>
                    <tbody>
                        {rows.map((row, rowIndex) => {
                            const cells = getContent(row).cells || [];
                            return (
                                <tr key={row.id}>
                                    {cells.map((cell, cellIndex) => {
                                        const Cell = (content.has_column_header && rowIndex === 0)
                                            || (content.has_row_header && cellIndex === 0)
                                            ? 'th'
                                            : 'td';
                                        return <Cell key={`${row.id}-${cellIndex}`}>{renderRichText(cell, row.id)}</Cell>;
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            );
        }
        case 'child_page':
        case 'child_database':
            return (
                <p key={block.id}>
                    <a href={`https://www.notion.so/${block.id.replace(/-/g, '')}`}>
                        {(typeof content.title === 'string' && content.title) || getText(block) || 'Open linked Notion page'}
                    </a>
                </p>
            );
        case 'column_list':
        case 'column':
        case 'synced_block':
            return <div key={block.id}>{children}</div>;
        default:
            return (
                <div key={block.id}>
                    {richText.length ? <p>{text}</p> : <p>Unsupported Notion block: {block.type}</p>}
                    {children}
                </div>
            );
    }
}

function renderBlocks(blocks: NotionBlock[], allBlocks: NotionBlock[] = blocks): ReactNode {
    const rendered: ReactNode[] = [];

    for (let index = 0; index < blocks.length;) {
        const block = blocks[index];
        if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
            const listType = block.type;
            const listBlocks: NotionBlock[] = [];
            while (index < blocks.length && blocks[index].type === listType) {
                listBlocks.push(blocks[index]);
                index += 1;
            }
            const List = listType === 'bulleted_list_item' ? 'ul' : 'ol';
            rendered.push(
                <List key={block.id}>
                    {listBlocks.map(item => (
                        <li key={item.id}>
                            {renderRichText(getRichText(item), item.id)}
                            {item.children?.length ? renderBlocks(item.children, allBlocks) : null}
                        </li>
                    ))}
                </List>
            );
        } else {
            rendered.push(renderBlock(block, allBlocks));
            index += 1;
        }
    }

    return rendered;
}

function createMailtoLink(title: string) {
    const subject = encodeURIComponent(`Re: ${title}`);
    const body = encodeURIComponent('Hey Arjun! My name is ');
    return `mailto:askalburgi@gmail.com?subject=${subject}&body=${body}`;
}

export default function NotionPage({
    blocks,
    recordMap,
    meta,
}: {
    blocks?: NotionBlock[];
    recordMap?: ExtendedRecordMap;
    meta: PostMeta;
}) {
    return (
        <div className="post-container">
            <small><Link href="/">← More writing</Link></small>
            <h1>{meta.title}</h1>
            <small>{meta.readingMinutes} min read by <Link href="https://arjunkalburgi.com">Arjun Kalburgi</Link> on {formatDate(meta.date)}</small>
            {blocks ? (
                <article className="prose">{renderBlocks(blocks)}</article>
            ) : recordMap ? (
                <NotionRenderer
                    recordMap={recordMap}
                    fullPage={false}
                    darkMode={false}
                    components={{
                        Code,
                        Collection,
                        Equation,
                        Property: NullComponent,
                        Modal,
                    }}
                />
            ) : null}
        </div>
    );
}
