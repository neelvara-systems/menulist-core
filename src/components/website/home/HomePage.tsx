import AnalyticsInsightsSection from './AnalyticsInsightsSection';
import StickyCta from '../shared/StickyCta';
import BusinessSection from './BusinessSection';
import CustomerBrowseSection from './CustomerBrowseSection';
import FaqSection from './FaqSection';
import FinalCtaSection from './FinalCtaSection';
import HeroSection from './HeroSection';
import IndustrySection from './IndustrySection';
import InteractiveWorkflowSection from './InteractiveWorkflowSection';
import PreparedForYouSection from './PreparedForYouSection';
import ProblemSection from './ProblemSection';
import SmartFeaturesSection from './SmartFeaturesSection';
import SolutionSection from './SolutionSection';
import StatsSection from './StatsSection';
import SurfacesSection from './SurfacesSection';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <InteractiveWorkflowSection />
      <PreparedForYouSection />
      <SurfacesSection />
      <CustomerBrowseSection />
      <SmartFeaturesSection />
      <AnalyticsInsightsSection />
      <StatsSection />
      <BusinessSection />
      <IndustrySection />
      <FaqSection />
      <FinalCtaSection />
      <StickyCta />
    </main>
  );
}
