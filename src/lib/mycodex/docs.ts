import fs from 'fs/promises';
import path from 'path';

export interface MyCodexDocNode {
    name: string;
    path: string;
    isDir: boolean;
    children?: MyCodexDocNode[];
}

export interface MyCodexHeading {
    text: string;
    level: number;
    id: string;
}

interface ResolvedMyCodexDocument {
    markdown: string;
    resolvedFilePath: string | null;
}

const HIDDEN_DOC_ENTRIES = new Set(['node_modules', 'archive', 'raw-data']);

export const getMyCodexDocsDir = () => path.resolve(process.cwd(), '__docs__');

export const createMyCodexHeadingId = (text: string) => text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const isVisibleDocsEntry = (name: string) => (
    !name.startsWith('.')
    && !name.startsWith('_')
    && !HIDDEN_DOC_ENTRIES.has(name)
);

const isInsideDocsDir = (docsDir: string, targetPath: string): boolean => {
    const relative = path.relative(docsDir, targetPath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const formatTitle = (name: string): string => name
    .replace(/\.md$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

export async function getMyCodexDocsTree(
    dirPath = getMyCodexDocsDir(),
    relativePath = '',
): Promise<MyCodexDocNode[]> {
    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        const nodes: MyCodexDocNode[] = [];

        for (const item of items) {
            if (!isVisibleDocsEntry(item.name)) {
                continue;
            }

            const fullPath = path.join(dirPath, item.name);
            const rel = relativePath ? `${relativePath}/${item.name}` : item.name;

            if (item.isDirectory()) {
                const children = await getMyCodexDocsTree(fullPath, rel);
                if (children.length > 0) {
                    nodes.push({
                        name: item.name,
                        path: rel,
                        isDir: true,
                        children,
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
                isVisibleDocsEntry(item.name)
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

export const getMyCodexSlugFromRoutePath = (value: string | null | undefined): string[] | null => {
    const rawPath = (value || '/').trim();
    if (rawPath.includes('\0') || rawPath.includes('\\')) return null;

    const withoutHash = rawPath.replace(/#.*$/, '');
    const withoutQuery = withoutHash.replace(/\?.*$/, '');
    const withoutLeadingSlash = withoutQuery.replace(/^\/+/, '').replace(/\/+$/, '');
    const withoutMarkdownSuffix = withoutLeadingSlash.replace(/\.md$/i, '');

    if (!withoutMarkdownSuffix) return [];

    const segments = withoutMarkdownSuffix.split('/').filter(Boolean);
    if (segments.some(segment => segment === '.' || segment === '..')) {
        return null;
    }

    return segments;
};

export async function resolveMyCodexDocument(slug: string[]): Promise<ResolvedMyCodexDocument> {
    const docsDir = getMyCodexDocsDir();
    let markdown = '';
    let resolvedFilePath: string | null = null;

    try {
        if (slug.length === 0) {
            const rootIndex = path.join(docsDir, 'index.md');
            resolvedFilePath = await getReadableMarkdownFile(rootIndex, docsDir);
            markdown = resolvedFilePath
                ? await fs.readFile(resolvedFilePath, 'utf8')
                : '# Document Not Found\n\nWe could not find the documentation index.';
        } else {
            const baseTarget = path.join(docsDir, ...slug);

            resolvedFilePath = await getReadableMarkdownFile(`${baseTarget}.md`, docsDir)
                || await getReadableMarkdownFile(baseTarget, docsDir);

            if (resolvedFilePath) {
                markdown = await fs.readFile(resolvedFilePath, 'utf8');
            } else {
                markdown = await getDirectoryIndexMarkdown(baseTarget, docsDir, slug)
                    || `# Document Not Found\n\nWe could not find the requested document at **${slug.join('/')}**.\n\nPlease check the navigation tree in the sidebar to browse available documentation.`;
            }
        }
    } catch {
        markdown = '# Error Loading Document\n\nThere was a problem reading the requested file.';
        resolvedFilePath = null;
    }

    return {
        markdown,
        resolvedFilePath,
    };
}

export const getMyCodexRelativeSourcePath = (resolvedFilePath: string | null) => (
    resolvedFilePath ? path.relative(process.cwd(), resolvedFilePath) : null
);

export function extractMyCodexHeadings(markdown: string): MyCodexHeading[] {
    const lines = markdown.split('\n');
    const headings: MyCodexHeading[] = [];

    for (const line of lines) {
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const text = match[2]
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/`([^`]+)`/g, '$1')
                .trim();
            const id = createMyCodexHeadingId(text);
            headings.push({ text, level, id });
        }
    }

    return headings;
}
