import { CanonicaInstallDocKey, renderCanonicaMarkdownDoc } from '@lib/canonica/installContract/contract';

export const markdownHeaders = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
};

export function buildInstallMarkdownResponse(key: CanonicaInstallDocKey) {
    return new Response(renderCanonicaMarkdownDoc(key), {
        headers: markdownHeaders,
    });
}
