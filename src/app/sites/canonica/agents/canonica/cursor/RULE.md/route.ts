import { buildAgentTextResponse } from '../../agentRoute';

export function GET() {
    return buildAgentTextResponse('cursorRuleMd');
}
