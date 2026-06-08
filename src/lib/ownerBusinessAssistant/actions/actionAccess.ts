import type { NextRequest } from 'next/server';
import { requireAnyStorePermission } from '@lib/permissions/server';
import type { OwnerBusinessActionDefinition } from '../types';

export async function requireOwnerBusinessAssistantActionAccess(params: {
  request: NextRequest;
  session: any;
  definition: OwnerBusinessActionDefinition;
}) {
  if (!params.definition.requiredPermissions.length) return null;
  return requireAnyStorePermission(
    params.request,
    params.session,
    params.definition.requiredPermissions as any,
    `Owner Assistant: ${params.definition.ownerLabel}`,
  );
}
