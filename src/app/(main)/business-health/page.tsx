import { FEATURE_FLAGS } from '@config/features';
import { normalizeOwnerBusinessAssistantProjectId } from '@lib/ownerBusinessAssistant/projectIdBoundary';
import { BusinessHealthPage } from '@template/main-app/ownerBusinessAssistant/BusinessHealthPage';
import { notFound } from 'next/navigation';

const normalizeProjectId = (value?: string | string[]) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return normalizeOwnerBusinessAssistantProjectId(raw) || undefined;
};

export default function Page({ searchParams }: { searchParams?: { projectId?: string | string[] } }) {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH || !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_PAGE) {
    notFound();
  }

  return <BusinessHealthPage projectId={normalizeProjectId(searchParams?.projectId)} />;
}
