import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import fetch from 'node-fetch'
import { Client as NotionOfficial } from '@notionhq/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const DATA_DIR = path.join(root, 'data')
const POSTS_DIR = path.join(DATA_DIR, 'posts')
const PUBLIC_NOTION_DIR = path.join(root, 'public', 'notion')
const DB_ID = process.env.NOTION_DATABASE_ID

const notion = new NotionOfficial({ auth: process.env.NOTION_API_KEY })

function ensureDirs() {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.mkdirSync(POSTS_DIR, { recursive: true })
    fs.mkdirSync(PUBLIC_NOTION_DIR, { recursive: true })
}

function sha1(str) {
    return crypto.createHash('sha1').update(str).digest('hex').slice(0, 16)
}

async function download(url, destRel) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
    const dest = path.join(root, 'public', destRel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(dest, buf)
}

function getProp(page, key) {
    const prop = page.properties?.[key]
    if (!prop) return ''
    if (prop.type === 'title') return prop.title.map(t => t.plain_text).join('')
    if (prop.type === 'rich_text') return prop.rich_text.map(t => t.plain_text).join('')
    if (prop.type === 'multi_select') return prop.multi_select.map(t => t.name)
    if (prop.type === 'date') return prop.date?.start || ''
    if (prop.type === 'checkbox') return prop.checkbox
    return ''
}

async function getPublishedPages() {
    const results = []
    let start_cursor

    do {
        const response = await notion.databases.query({
            database_id: DB_ID,
            filter: { property: 'Published', checkbox: { equals: true } },
            sorts: [{ property: 'Date', direction: 'descending' }],
            ...(start_cursor ? { start_cursor } : {}),
        })
        results.push(...response.results)
        start_cursor = response.next_cursor
    } while (start_cursor)

    return results
}

async function getPageBlocks(blockId) {
    const blocks = []
    let start_cursor

    do {
        const response = await notion.blocks.children.list({
            block_id: blockId,
            page_size: 100,
            ...(start_cursor ? { start_cursor } : {}),
        })
        blocks.push(...response.results)
        start_cursor = response.next_cursor
    } while (start_cursor)

    for (const block of blocks) {
        if (block.has_children) {
            block.children = await getPageBlocks(block.id)
        }
    }

    return blocks
}

function getBlockContent(block) {
    return block[block.type] || {}
}

function getRichText(block) {
    const content = getBlockContent(block)
    if (Array.isArray(content.rich_text)) return content.rich_text
    if (Array.isArray(content.title)) return content.title
    return []
}

function getBlockText(blocks) {
    return blocks.flatMap(block => [
        getRichText(block).map(text => text.plain_text).join(' '),
        ...(block.children ? getBlockText(block.children) : []),
    ])
}

function getFileSource(block) {
    const content = getBlockContent(block)
    return content.file || content.external
}

function getBasePrefix() {
    if (process.env.CUSTOM_DOMAIN) return ''
    const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
    return repositoryName ? `/${repositoryName}` : ''
}

async function localizeAssets(blocks, basePrefix, downloads) {
    for (const block of blocks) {
        if (['image', 'file', 'video', 'pdf', 'audio'].includes(block.type)) {
            const source = getFileSource(block)
            if (source?.url) {
                let localPath = downloads.get(source.url)
                if (!localPath) {
                    const ext = path.extname(new URL(source.url).pathname) || '.bin'
                    const filename = `${sha1(source.url)}${ext}`
                    const destRel = path.join('notion', filename)
                    await download(source.url, destRel)
                    localPath = `${basePrefix}/notion/${filename}`
                    downloads.set(source.url, localPath)
                }
                source.url = localPath
            }
        }

        if (block.children) {
            await localizeAssets(block.children, basePrefix, downloads)
        }
    }
}

function getReadingMinutes(blocks) {
    const words = getBlockText(blocks)
        .join(' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length
    return Math.max(1, Math.round(words / 200))
}

async function main() {
    if (!process.env.NOTION_API_KEY || !DB_ID) {
        throw new Error('Missing NOTION_API_KEY or NOTION_DATABASE_ID env vars')
    }

    ensureDirs()

    console.log('Querying Notion database...')
    const pages = await getPublishedPages()
    const indexMeta = []
    const downloads = new Map()
    const basePrefix = getBasePrefix()

    for (const page of pages) {
        const pageId = page.id
        const title = getProp(page, 'Name')
        const slug =
            getProp(page, 'Slug') ||
            title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const date = getProp(page, 'Date')
        const summary = getProp(page, 'Summary')
        const contentType = getProp(page, 'Content type')
        const unlisted = getProp(page, 'Unlisted') === true

        console.log(`Fetching blocks for: ${title} (${slug})`)
        const blocks = await getPageBlocks(pageId)
        await localizeAssets(blocks, basePrefix, downloads)

        const outPath = path.join(POSTS_DIR, `${slug}.json`)
        fs.writeFileSync(outPath, JSON.stringify({ blocks }))

        const hero = blocks
            .find(block => block.type === 'image')
        const heroSource = hero && getFileSource(hero)
        const readingMinutes = getReadingMinutes(blocks)

        indexMeta.push({
            title,
            slug,
            date,
            summary,
            hero: heroSource?.url || null,
            contentType,
            readingMinutes,
            unlisted,
        })
    }

    fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(indexMeta, null, 2))
    console.log(`Wrote ${indexMeta.length} posts to data/`)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
