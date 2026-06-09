import type { NextRequest } from 'next/server';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import type { OwnerBusinessActionDefinition } from '../types';

export async function requireOwnerBusinessAssistantActionAccess(params: {
  request: NextRequest;
  session: any;
  definition: OwnerBusinessActionDefinition;
  tId: string | number;
  sId: string | number;
}) {
  if (!params.definition.requiredPermissions.length) return null;
  return requireAnyStorePermissionForStore(
    params.request,
    params.session,
    params.definition.requiredPermissions as any,
    `Owner Assistant: ${params.definition.ownerLabel}`,
    params.sId,
    params.tId,
  );
}
