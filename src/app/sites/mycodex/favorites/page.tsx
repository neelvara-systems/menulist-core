import React from 'react';
import { headers } from 'next/headers';
import MyCodexClientContainer from '../components/MyCodexClientContainer';
import { getMyCodexDocsTree } from '@lib/mycodex/docs';
import { isMyCodexLocalDevelopmentHost } from '@lib/mycodex/requestHost';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function MyCodexFavoritesPage() {
    const host = headers().get('host') || '';
    const isLocalDev = isMyCodexLocalDevelopmentHost(host);
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
