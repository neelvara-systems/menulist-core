export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { buildOwnerBusinessAssistantContextPacket } from '@lib/ownerBusinessAssistant/server/buildOwnerBusinessAssistantContextPacket';
import { OwnerBusinessAssistantScopeSchema } from '@lib/ownerBusinessAssistant/schemas';
import {
  applyOwnerBusinessAssistantRateLimit,
  ensureOwnerAssistantTenantAccess,
  getOwnerAssistantSessionScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (request: NextRequest, session) => {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
  }

  const rateLimit = await applyOwnerBusinessAssistantRateLimit({
    request,
    session,
    feature: 'DATA_READ',
    keyPrefix: 'owner-business-assistant-current',
  });
  if (rateLimit) return rateLimit;

  const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.VIEW_ANALYTICS], 'Business Health');
  if (permissionError) return permissionError;

  const { tId, sId } = getOwnerAssistantSessionScope(session);
  const accessError = ensureOwnerAssistantTenantAccess(request, session, tId, sId);
  if (accessError) return accessError;

  const parsedScope = OwnerBusinessAssistantScopeSchema
    .pick({ projectId: true })
    .safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsedScope.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsedScope.error.flatten() }, { status: 400 });
  }

  const packet = await buildOwnerBusinessAssistantContextPacket({
    tId,
    sId,
    projectId: parsedScope.data.projectId,
    packetProfile: 'health_card',
  });

  return NextResponse.json({
    data: packet.health,
    cache: {
      source: packet.cacheSource,
      cacheKey: packet.cacheKey,
      generatedAt: packet.generatedAt,
      metrics: {
        ...packet.metrics,
        route: '/api/owner-business-assistant/current',
      },
    },
  });
});
