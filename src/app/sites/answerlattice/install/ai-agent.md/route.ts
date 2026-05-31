import { buildInstallMarkdownResponse } from '../markdownRoute';

export const dynamic = 'force-static';

export function GET() {
    return buildInstallMarkdownResponse('ai-agent');
}
