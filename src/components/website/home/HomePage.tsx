import StickyCta from '../shared/StickyCta';
import AiMenuManagerSection from './AiMenuManagerSection';
import BusinessHealthSection from './BusinessHealthSection';
import CustomerBrowseSection from './CustomerBrowseSection';
import FaqSection from './FaqSection';
import FinalCtaSection from './FinalCtaSection';
import HeroSection from './HeroSection';
import InteractiveWorkflowSection from './InteractiveWorkflowSection';
import PreparedForYouSection from './PreparedForYouSection';
import ProblemSection from './ProblemSection';
import PublicTruthLoopSection from './PublicTruthLoopSection';
import ResourcesSection from './ResourcesSection';
import SetupReliefSection from './SetupReliefSection';
import SurfacesSection from './SurfacesSection';
import WebsiteReplacementBlock from '../shared/WebsiteReplacementBlock';
import { FEATURE_FLAGS } from '@config/features';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ProblemSection />
      <InteractiveWorkflowSection />
      <PublicTruthLoopSection />
      <WebsiteReplacementBlock variant="default" />
      <AiMenuManagerSection />
      <SetupReliefSection />
      <SurfacesSection />
      <CustomerBrowseSection />
      <PreparedForYouSection />
      <BusinessHealthSection />
      {FEATURE_FLAGS.ENABLE_WEBSITE_RESOURCES ? <ResourcesSection /> : null}
      <FaqSection />
      <FinalCtaSection />
      <StickyCta />
    </main>
  );
}
