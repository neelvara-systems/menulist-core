import { randomUUID } from 'crypto';
import type { OwnerBusinessAssistantActionRequest } from '../schemas';
import type { OwnerBusinessAssistantActionResult } from '../types';

export async function updateOwnerBusinessHealthCheckWorkflow(params: {
  tId: string | number;
  sId: string | number;
  userId?: string | number;
  request: OwnerBusinessAssistantActionRequest;
  status: 'reviewed' | 'dismissed' | 'cancelled';
}): Promise<OwnerBusinessAssistantActionResult> {
  const actionId = params.request.actionId || randomUUID();
  const resultStatus = params.status === 'reviewed'
    ? 'reviewed'
    : params.status === 'dismissed'
      ? 'dismissed'
      : 'cancelled';

  return {
    success: true,
    status: resultStatus,
    message: params.status === 'reviewed' ? 'Marked as reviewed.' : params.status === 'dismissed' ? 'Dismissed.' : 'Cancelled.',
    actionId,
  };
}
