import { FEATURE_FLAGS } from '@config/features';
import { BusinessHealthPage } from '@template/main-app/ownerBusinessAssistant/BusinessHealthPage';
import { notFound } from 'next/navigation';

export default function Page() {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH || !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_PAGE) {
    notFound();
  }

  return <BusinessHealthPage />;
}
