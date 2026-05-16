/* eslint-disable react/jsx-no-undef */
import { FEATURE_FLAGS } from '@config/features';
import CanonicaCoverageKPI from '@template/canonica/CanonicaCoverageKPI';
import EntityCandidateReview from '@template/canonica/EntityCandidateReview';
import MutationProposalReview from '@template/canonica/MutationProposalReview';
import { Col, Flex, Row } from 'antd';
import BrowseCategories from './BrowseCategories';
import LandingFooter from './LandingFooter';
import RecentlyViewed from './RecentlyViewed';
import RunningTickets from './RunningTickets';
import TrendingTopics from './TrendingTopics';
import WhatsNew from './WhatsNew';

function LandingPage() {

    return (
        <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
            <RunningTickets />
            <Row gutter={[24, 24]} style={{ marginTop: 32 }}>
                <Col xs={24} md={14}>
                    <WhatsNew />
                </Col>
                <Col xs={24} md={10}>
                    <Flex style={{ width: '100%' }} vertical gap="large">
                        <CanonicaCoverageKPI />
                        <TrendingTopics />
                        <RecentlyViewed />
                    </Flex>
                </Col>
            </Row>
            <div style={{ marginTop: 32 }}>
                <BrowseCategories />
            </div>
            {FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION && <MutationProposalReview />}
            {FEATURE_FLAGS.ENABLE_CANONICA_ONTOLOGY && <EntityCandidateReview />}

            <LandingFooter />
        </div>
    );
}

export default LandingPage;
