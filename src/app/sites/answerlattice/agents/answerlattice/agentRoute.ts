import JSZip from 'jszip';
import {
    buildAnswerlatticeAgentKitFiles,
    renderAnswerlatticeAgentsMd,
    renderAnswerlatticeClaudeMd,
    renderAnswerlatticeCursorRule,
    renderAnswerlatticeCursorRuleMd,
    renderAnswerlatticeSkill,
    renderAnswerlatticeWindsurfRule,
} from '@lib/answerlattice/installContract/contract';

const textHeaders = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
};

export function buildAgentTextResponse(kind: 'agents' | 'claude' | 'cursor' | 'cursorRuleMd' | 'windsurf' | 'skill') {
    const contentByKind = {
        agents: renderAnswerlatticeAgentsMd(),
        claude: renderAnswerlatticeClaudeMd(),
        cursor: renderAnswerlatticeCursorRule(),
        cursorRuleMd: renderAnswerlatticeCursorRuleMd(),
        windsurf: renderAnswerlatticeWindsurfRule(),
        skill: renderAnswerlatticeSkill(),
    };

    return new Response(contentByKind[kind], {
        headers: textHeaders,
    });
}

export async function buildPublicAgentKitResponse() {
    const zip = new JSZip();
    const files = buildAnswerlatticeAgentKitFiles();
    Object.entries(files).forEach(([filePath, content]) => {
        zip.file(`answerlattice-agent-kit/${filePath}`, content);
    });
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    return new Response(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="answerlattice-agent-kit.zip"',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
