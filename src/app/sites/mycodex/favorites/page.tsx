import React from 'react';
import MyCodexClientContainer from '../components/MyCodexClientContainer';
import { getMyCodexDocsTree } from '@lib/mycodex/docs';
import { getMyCodexRequestBasePath } from '@lib/mycodex/requestBasePath';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function MyCodexFavoritesPage() {
    const basePath = await getMyCodexRequestBasePath();
    const docsTree = await getMyCodexDocsTree();

    return (
        <MyCodexClientContainer
            basePath={basePath}
            docsTree={docsTree}
            currentMarkdown=""
            currentSlug={['favorites']}
            headings={[]}
            sourceFilePath={null}
            viewMode="favorites"
        />
    );
}
