import { buildInstallMarkdownResponse } from '../install/markdownRoute';

export const dynamic = 'force-static';

export function GET() {
    return buildInstallMarkdownResponse('overview');
}
