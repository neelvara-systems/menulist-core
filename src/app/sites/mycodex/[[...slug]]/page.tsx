import React from 'react';
import { headers } from 'next/headers';
import MyCodexClientContainer from '../components/MyCodexClientContainer';
import {
    extractMyCodexHeadings,
    getMyCodexDocsTree,
    getMyCodexRelativeSourcePath,
    resolveMyCodexDocument,
} from '@lib/mycodex/docs';
import { isMyCodexLocalDevelopmentHost } from '@lib/mycodex/requestHost';

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
    const host = (await headers()).get('host') || '';
    const isLocalDev = isMyCodexLocalDevelopmentHost(host);
    const docsTree = await getMyCodexDocsTree();
    const { markdown, resolvedFilePath } = await resolveMyCodexDocument(slug);
    const headings = extractMyCodexHeadings(markdown);

    return (
        <MyCodexClientContainer
            docsTree={docsTree}
            currentMarkdown={markdown}
            currentSlug={slug}
            headings={headings}
            isLocalDev={isLocalDev}
            sourceFilePath={getMyCodexRelativeSourcePath(resolvedFilePath)}
        />
    );
}
