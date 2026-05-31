import { AnswerlatticeInstallDocKey, renderAnswerlatticeMarkdownDoc } from '@lib/answerlattice/installContract/contract';

export const markdownHeaders = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
};

export function buildInstallMarkdownResponse(key: AnswerlatticeInstallDocKey) {
    return new Response(renderAnswerlatticeMarkdownDoc(key), {
        headers: markdownHeaders,
    });
}
