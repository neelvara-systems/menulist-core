import StickyCta from '../shared/StickyCta';
import CustomerBrowseSection from './CustomerBrowseSection';
import FaqSection from './FaqSection';
import FinalCtaSection from './FinalCtaSection';
import HeroSection from './HeroSection';
import InteractiveWorkflowSection from './InteractiveWorkflowSection';
import PreparedForYouSection from './PreparedForYouSection';
import ProblemSection from './ProblemSection';
import ResourcesSection from './ResourcesSection';
import SetupReliefSection from './SetupReliefSection';
import SurfacesSection from './SurfacesSection';
import { FEATURE_FLAGS } from '@config/features';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ProblemSection />
      <InteractiveWorkflowSection />
      <SetupReliefSection />
      <SurfacesSection />
      <CustomerBrowseSection />
      <PreparedForYouSection />
      {FEATURE_FLAGS.ENABLE_WEBSITE_RESOURCES ? <ResourcesSection /> : null}
      <FaqSection />
      <FinalCtaSection />
      <StickyCta />
    </main>
  );
}
