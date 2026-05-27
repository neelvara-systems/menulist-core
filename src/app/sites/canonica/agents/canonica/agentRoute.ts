import JSZip from 'jszip';
import {
    buildCanonicaAgentKitFiles,
    renderCanonicaAgentsMd,
    renderCanonicaClaudeMd,
    renderCanonicaCursorRule,
    renderCanonicaCursorRuleMd,
    renderCanonicaSkill,
    renderCanonicaWindsurfRule,
} from '@lib/canonica/installContract/contract';

const textHeaders = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
};

export function buildAgentTextResponse(kind: 'agents' | 'claude' | 'cursor' | 'cursorRuleMd' | 'windsurf' | 'skill') {
    const contentByKind = {
        agents: renderCanonicaAgentsMd(),
        claude: renderCanonicaClaudeMd(),
        cursor: renderCanonicaCursorRule(),
        cursorRuleMd: renderCanonicaCursorRuleMd(),
        windsurf: renderCanonicaWindsurfRule(),
        skill: renderCanonicaSkill(),
    };

    return new Response(contentByKind[kind], {
        headers: textHeaders,
    });
}

export async function buildPublicAgentKitResponse() {
    const zip = new JSZip();
    const files = buildCanonicaAgentKitFiles();
    Object.entries(files).forEach(([filePath, content]) => {
        zip.file(`canonica-agent-kit/${filePath}`, content);
    });
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    return new Response(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="canonica-agent-kit.zip"',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
