import { buildAgentTextResponse } from '../agentRoute';

export const dynamic = 'force-static';

export function GET() {
    return buildAgentTextResponse('cursor');
}
