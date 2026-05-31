import { buildPublicAgentKitResponse } from '../agentRoute';

export const dynamic = 'force-static';

export function GET() {
    return buildPublicAgentKitResponse();
}
