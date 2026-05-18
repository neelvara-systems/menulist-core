import StickyCta from '../shared/StickyCta';
import AnalyticsInsightsSection from './AnalyticsInsightsSection';
import BusinessSection from './BusinessSection';
import CustomerBrowseSection from './CustomerBrowseSection';
import FaqSection from './FaqSection';
import FinalCtaSection from './FinalCtaSection';
import HeroSection from './HeroSection';
import IndustrySection from './IndustrySection';
import InteractiveWorkflowSection from './InteractiveWorkflowSection';
import PreparedForYouSection from './PreparedForYouSection';
import ProblemSection from './ProblemSection';
import RevenuePathSection from './RevenuePathSection';
import SearchDiscoverySection from './SearchDiscoverySection';
import SetupReliefSection from './SetupReliefSection';
import SmartFeaturesSection from './SmartFeaturesSection';
import SolutionSection from './SolutionSection';
import StatsSection from './StatsSection';
import SurfacesSection from './SurfacesSection';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <RevenuePathSection />
      <InteractiveWorkflowSection />
      <ProblemSection />
      <SolutionSection />
      <StatsSection />
      <SetupReliefSection />
      <SurfacesSection />
      <SearchDiscoverySection />
      <CustomerBrowseSection />
      <AnalyticsInsightsSection />
      <SmartFeaturesSection />
      <PreparedForYouSection />
      <BusinessSection />
      <IndustrySection />
      <FaqSection />
      <FinalCtaSection />
      <StickyCta />
    </main>
  );
}
