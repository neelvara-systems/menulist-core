export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { buildOwnerBusinessAssistantContextPacket } from '@lib/ownerBusinessAssistant/server/buildOwnerBusinessAssistantContextPacket';
import { OwnerBusinessAssistantScopeSchema } from '@lib/ownerBusinessAssistant/schemas';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import {
  applyOwnerBusinessAssistantRateLimit,
  resolveOwnerAssistantSelectedStoreScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (request: NextRequest, session) => {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH || !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
  }

  const rateLimit = await applyOwnerBusinessAssistantRateLimit({
    request,
    session,
    feature: 'DATA_READ',
    keyPrefix: 'owner-business-assistant-analytics',
  });
  if (rateLimit) return rateLimit;

  const parsedScope = OwnerBusinessAssistantScopeSchema
    .pick({ projectId: true, storeId: true })
    .safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsedScope.success) {
    return NextResponse.json({ error: 'Invalid query', details: getSafeZodValidationDetails(parsedScope.error) }, { status: 400 });
  }

  const scope = resolveOwnerAssistantSelectedStoreScope(request, session, parsedScope.data.storeId);
  if ('error' in scope) return scope.error;

  const permissionError = await requireAnyStorePermissionForStore(
    request,
    session,
    [PERMISSIONS.VIEW_ANALYTICS],
    'Business Health analytics',
    scope.sId,
    scope.tId,
  );
  if (permissionError) return permissionError;

  const packet = await buildOwnerBusinessAssistantContextPacket({
    tId: scope.tId,
    sId: scope.sId,
    projectId: parsedScope.data.projectId,
    packetProfile: 'analytics_periods',
  });

  return NextResponse.json({
    data: packet.analytics || null,
    cache: {
      source: packet.cacheSource,
      cacheKey: packet.cacheKey,
      generatedAt: packet.generatedAt,
      metrics: {
        ...packet.metrics,
        route: '/api/owner-business-assistant/analytics',
      },
    },
  });
});
