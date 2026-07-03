import StickyCta from '../shared/StickyCta';
import BeforeAfterSection from './BeforeAfterSection';
import CreateMenuPreviewSection from './CreateMenuPreviewSection';
import CustomerBrowseSection from './CustomerBrowseSection';
import CustomerLinkIncludesSection from './CustomerLinkIncludesSection';
import FaqSection from './FaqSection';
import FinalCtaSection from './FinalCtaSection';
import HeroSection from './HeroSection';
import OwnerProofSection from './OwnerProofSection';

export default function HomePage() {
  return (
    <main>
      <div id="website-sticky-cta-start" className="ws-sticky-cta-observer">
        <HeroSection />
      </div>
      <CreateMenuPreviewSection />
      <BeforeAfterSection />
      <CustomerBrowseSection />
      <CustomerLinkIncludesSection />
      <OwnerProofSection />
      {/*
        Previous/deeper homepage section mounts kept as references.
        They remain unmounted for the mobile try-first homepage compression:

        <RevenuePathSection />
        <ProblemSection />
        <SwitchComparisonSection />
        <InteractiveWorkflowSection />
        <PublicTruthLoopSection />
        <WebsiteReplacementBlock variant="default" />
        <AiMenuManagerSection />
        <SetupReliefSection />
        <SurfacesSection />
        <PreparedForYouSection />
        <BusinessHealthSection />
        <ResourcesSection />
      */}
      <FaqSection />
      <div id="website-sticky-cta-stop" className="ws-sticky-cta-observer">
        <FinalCtaSection />
      </div>
      <StickyCta />
    </main>
  );
}
