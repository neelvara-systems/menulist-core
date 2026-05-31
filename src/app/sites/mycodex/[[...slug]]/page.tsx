import React from 'react';
import fs from 'fs/promises';
import path from 'path';
import { headers } from 'next/headers';
import MyCodexClientContainer from '../components/MyCodexClientContainer';

interface DocNode {
    name: string;
    path: string;
    isDir: boolean;
    children?: DocNode[];
}

interface Heading {
    text: string;
    level: number;
    id: string;
}

const createHeadingId = (text: string) => text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

// Disable Next.js routing cache so filesystem modifications show up in real-time
export const revalidate = 0;
export const dynamic = 'force-dynamic';

/**
 * Dynamic recursive crawler to build MyCodex navigation tree
 */
async function getDocsTree(dirPath: string, relativePath = ''): Promise<DocNode[]> {
    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        const nodes: DocNode[] = [];

        for (const item of items) {
            // Filter out hidden, system, and archived files
            if (
                item.name.startsWith('.') || 
                item.name.startsWith('_') || 
                item.name === 'node_modules' || 
                item.name === 'archive' ||
                item.name === 'raw-data'
            ) {
                continue;
            }

            const fullPath = path.join(dirPath, item.name);
            const rel = relativePath ? `${relativePath}/${item.name}` : item.name;

            if (item.isDirectory()) {
                const children = await getDocsTree(fullPath, rel);
                if (children.length > 0) {
                    nodes.push({
                        name: item.name,
                        path: rel,
                        isDir: true,
                        children: children,
                    });
                }
            } else if (item.name.endsWith('.md')) {
                nodes.push({
                    name: item.name,
                    path: rel.replace(/\.md$/, ''),
                    isDir: false,
                });
            }
        }

        // Sort items: README/index first, then folders, then files alphabetically
        return nodes.sort((a, b) => {
            const isReadmeA = a.name.toLowerCase() === 'readme.md' || a.name.toLowerCase() === 'index.md';
            const isReadmeB = b.name.toLowerCase() === 'readme.md' || b.name.toLowerCase() === 'index.md';
            if (isReadmeA) return -1;
            if (isReadmeB) return 1;
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
        });
    } catch {
        return [];
    }
}

function isInsideDocsDir(docsDir: string, targetPath: string): boolean {
    const relative = path.relative(docsDir, targetPath);
    return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function formatTitle(name: string): string {
    return name
        .replace(/\.md$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

async function getReadableMarkdownFile(targetPath: string, docsDir: string): Promise<string | null> {
    const resolvedPath = path.resolve(targetPath);

    if (!isInsideDocsDir(docsDir, resolvedPath)) {
        return null;
    }

    try {
        const stat = await fs.stat(resolvedPath);
        if (stat.isFile() && resolvedPath.endsWith('.md')) {
            return resolvedPath;
        }

        if (stat.isDirectory()) {
            const candidates = [
                path.join(resolvedPath, 'README.md'),
                path.join(resolvedPath, 'index.md'),
            ];

            for (const candidate of candidates) {
                const readable = await getReadableMarkdownFile(candidate, docsDir);
                if (readable) return readable;
            }
        }
    } catch {
        return null;
    }

    return null;
}

async function getDirectoryIndexMarkdown(directoryPath: string, docsDir: string, slug: string[]): Promise<string | null> {
    const resolvedPath = path.resolve(directoryPath);

    if (!isInsideDocsDir(docsDir, resolvedPath)) {
        return null;
    }

    try {
        const stat = await fs.stat(resolvedPath);
        if (!stat.isDirectory()) {
            return null;
        }

        const items = await fs.readdir(resolvedPath, { withFileTypes: true });
        const visibleItems = items
            .filter(item => (
                !item.name.startsWith('.')
                && !item.name.startsWith('_')
                && item.name !== 'node_modules'
                && item.name !== 'archive'
                && item.name !== 'raw-data'
                && (item.isDirectory() || item.name.endsWith('.md'))
            ))
            .sort((a, b) => {
                if (a.isDirectory() && !b.isDirectory()) return -1;
                if (!a.isDirectory() && b.isDirectory()) return 1;
                return a.name.localeCompare(b.name);
            });

        const folderTitle = slug.length > 0 ? formatTitle(slug[slug.length - 1]) : 'Documentation';

        if (visibleItems.length === 0) {
            return `# ${folderTitle}\n\nThis folder does not contain readable Markdown documents.`;
        }

        const lines = visibleItems.map(item => {
            const itemTitle = formatTitle(item.name);
            const href = item.isDirectory()
                ? `./${item.name}`
                : `./${item.name}`;
            return `- [${itemTitle}](${href})`;
        });

        return [
            `# ${folderTitle}`,
            '',
            'Documents in this folder:',
            '',
            ...lines,
        ].join('\n');
    } catch {
        return null;
    }
}

/**
 * Extract headers to build the Table of Contents outline
 */
function extractHeadings(markdown: string): Heading[] {
    const lines = markdown.split('\n');
    const headings: Heading[] = [];

    for (const line of lines) {
        // Match standard markdown headers: #, ##, ###
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const text = match[2]
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip links
                .replace(/`([^`]+)`/g, '$1')            // strip inline code
                .trim();
            const id = createHeadingId(text);
            headings.push({ text, level, id });
        }
    }

    return headings;
}

interface PageProps {
    params: {
        slug?: string[];
    };
}

export default async function MyCodexPage({ params }: PageProps) {
    const slug = params.slug || [];
    const docsDir = path.resolve(process.cwd(), '__docs__');

    // Resolve routing environment (local vs production)
    const host = headers().get('host') || '';
    const isLocalDev = host.includes('localhost') || host.includes('127.0.0.1');

    // Build the navigation tree
    const docsTree = await getDocsTree(docsDir);

    let markdownContent = '';
    let resolvedFilePath = '';

    try {
        if (slug.length === 0) {
            // Serve master index file by default at root slug
            const rootIndex = path.join(docsDir, 'index.md');
            resolvedFilePath = await getReadableMarkdownFile(rootIndex, docsDir) || '';
            markdownContent = resolvedFilePath
                ? await fs.readFile(resolvedFilePath, 'utf8')
                : '# Document Not Found\n\nWe could not find the documentation index.';
        } else {
            // Resolve requested path
            const baseTarget = path.join(docsDir, ...slug);

            resolvedFilePath = await getReadableMarkdownFile(`${baseTarget}.md`, docsDir)
                || await getReadableMarkdownFile(baseTarget, docsDir)
                || '';

            if (resolvedFilePath) {
                markdownContent = await fs.readFile(resolvedFilePath, 'utf8');
            } else {
                markdownContent = await getDirectoryIndexMarkdown(baseTarget, docsDir, slug)
                    || `# Document Not Found\n\nWe could not find the requested document at **${slug.join('/')}**.\n\nPlease check the navigation tree in the sidebar to browse available documentation.`;
            }
        }
    } catch {
        markdownContent = '# Error Loading Document\n\nThere was a problem reading the requested file.';
    }

    // Extract outline headings for Table of Contents
    const headings = extractHeadings(markdownContent);

    return (
        <MyCodexClientContainer
            docsTree={docsTree}
            currentMarkdown={markdownContent}
            currentSlug={slug}
            headings={headings}
            isLocalDev={isLocalDev}
            sourceFilePath={resolvedFilePath ? path.relative(process.cwd(), resolvedFilePath) : null}
        />
    );
}
