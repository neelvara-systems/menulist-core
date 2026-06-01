import React from 'react';
import { headers } from 'next/headers';
import MyCodexClientContainer from '../components/MyCodexClientContainer';
import { getMyCodexDocsTree } from '@lib/mycodex/docs';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function MyCodexFavoritesPage() {
    const host = headers().get('host') || '';
    const isLocalDev = host.includes('localhost') || host.includes('127.0.0.1');
    const docsTree = await getMyCodexDocsTree();

    return (
        <MyCodexClientContainer
            docsTree={docsTree}
            currentMarkdown=""
            currentSlug={['favorites']}
            headings={[]}
            isLocalDev={isLocalDev}
            sourceFilePath={null}
            viewMode="favorites"
        />
    );
}
