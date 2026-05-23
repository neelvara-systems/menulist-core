import StickyCta from '../shared/StickyCta';
import CustomerBrowseSection from './CustomerBrowseSection';
import FaqSection from './FaqSection';
import FinalCtaSection from './FinalCtaSection';
import HeroSection from './HeroSection';
import InteractiveWorkflowSection from './InteractiveWorkflowSection';
import PreparedForYouSection from './PreparedForYouSection';
import ProblemSection from './ProblemSection';
import SetupReliefSection from './SetupReliefSection';
import SurfacesSection from './SurfacesSection';

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
      <FaqSection />
      <FinalCtaSection />
      <StickyCta />
    </main>
  );
}
