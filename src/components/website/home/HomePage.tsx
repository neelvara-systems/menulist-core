import StickyCta from '../shared/StickyCta';
import CustomerBrowseSection from './CustomerBrowseSection';
import FaqSection from './FaqSection';
import FinalCtaSection from './FinalCtaSection';
import HeroSection from './HeroSection';
import InteractiveWorkflowSection from './InteractiveWorkflowSection';
import PreparedForYouSection from './PreparedForYouSection';
import ProblemSection from './ProblemSection';
import SetupReliefSection from './SetupReliefSection';
import SolutionSection from './SolutionSection';
import SurfacesSection from './SurfacesSection';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
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
