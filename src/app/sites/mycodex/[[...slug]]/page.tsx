import React from 'react';
import MyCodexClientContainer from '../components/MyCodexClientContainer';
import {
    extractMyCodexHeadings,
    getMyCodexDocsTree,
    getMyCodexRelativeSourcePath,
    resolveMyCodexDocument,
} from '@lib/mycodex/docs';
import { getMyCodexRequestBasePath } from '@lib/mycodex/requestBasePath';

// Disable Next.js routing cache so filesystem modifications show up in real-time.
export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{
        slug?: string[];
    }>;
}

export default async function MyCodexPage(props: PageProps) {
    const params = await props.params;
    const slug = params.slug || [];
    const basePath = await getMyCodexRequestBasePath();
    const docsTree = await getMyCodexDocsTree();
    const { markdown, resolvedFilePath } = await resolveMyCodexDocument(slug);
    const headings = extractMyCodexHeadings(markdown);

    return (
        <MyCodexClientContainer
            basePath={basePath}
            docsTree={docsTree}
            currentMarkdown={markdown}
            currentSlug={slug}
            headings={headings}
            sourceFilePath={getMyCodexRelativeSourcePath(resolvedFilePath)}
        />
    );
}
