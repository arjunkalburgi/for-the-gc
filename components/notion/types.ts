export type PostMeta = {
    title: string;
    slug: string;
    date: string;
    tags: string[];
    summary: string;
    hero?: string | null;
    contentType?: string[];
    readingMinutes: number;
    unlisted?: boolean;
};

export type NotionRichText = {
    plain_text?: string;
    href?: string | null;
    text?: {
        content?: string;
        link?: { url: string } | null;
    };
    equation?: { expression: string };
    annotations?: {
        bold?: boolean;
        italic?: boolean;
        strikethrough?: boolean;
        underline?: boolean;
        code?: boolean;
        color?: string;
    };
};

export type NotionBlock = {
    id: string;
    type: string;
    has_children?: boolean;
    children?: NotionBlock[];
    [key: string]: unknown;
};