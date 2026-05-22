'use client';

import { getPreviousIngestionJobs } from '@database/kb-generation/jobs';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { useIngestionJobsListener } from '@hook/useIngestionJobsListener';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { ARTICLE_RECONCILIATION_STATUS, INGESTION_JOB_STATUS, IngestionJob } from '@type/knowledgeBase';
import { Alert, Button, Card, Col, Empty, Flex, Grid, Layout, message, Row, Typography } from 'antd';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuEye, LuPlus } from 'react-icons/lu';
import JobCard from './jobCard';
import JobHistory from './jobHistory';
import JobDetailsDrawer from './jobHistory/JobDetailsDrawer';
import ReconciliationModal from './reconciliation';
import ReviewModal from './ReviewModal';
import UploadModal from './UploadModal';

const { Title, Paragraph } = Typography;
const { Content } = Layout;

function KBGenerationTemplate() {
    const session = useClientAuthSession();
    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [previousJobs, setPreviousJobs] = useState<IngestionJob[]>([]);
    const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [showReconciliationModal, setShowReconciliationModal] = useState(false);
    const [articlesToReview, setArticlesToReview] = useState<IngestionJob['articlesToReview']>([]);
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const dispatch = useAppDispatch()
    const [isHistoryfetched, setisHistoryfetched] = useState(false)
    const scope = useMemo(() => {
        const tId = Number(session?.tId ?? storeDetails?.tenantId);
        const sId = Number(session?.sId ?? storeDetails?.storeId);
        return {
            tId: Number.isFinite(tId) && tId > 0 ? tId : 0,
            sId: Number.isFinite(sId) && sId > 0 ? sId : 0,
        };
    }, [session?.sId, session?.tId, storeDetails?.storeId, storeDetails?.tenantId]);
    const { activeJob } = useIngestionJobsListener(scope);
    const hasScope = scope.tId > 0 && scope.sId > 0;

    const handleReviewClick = () => {
        if (!checkArticlesToReview() && activeJob && activeJob.status === INGESTION_JOB_STATUS.NEEDS_REVIEW) {
            setShowReviewModal(true);
        }
    };

    const checkArticlesToReview = () => {
        setShowReconciliationModal(false);
        setArticlesToReview([]);
        if (activeJob?.articlesToReview && activeJob.articlesToReview.length > 0) {

            const unresolvedArticles = activeJob.articlesToReview.filter(article => article.status === ARTICLE_RECONCILIATION_STATUS.UNRESOLVED);
            if (unresolvedArticles.length > 0) {
                setArticlesToReview(unresolvedArticles);
                setShowReconciliationModal(true);
                return true
            }
        }
        return false;
    };

    useEffect(() => {
        checkArticlesToReview();
    }, [activeJob]);

    const handleCardClick = (job: IngestionJob) => {
        setSelectedJob(job);
        setIsDrawerVisible(true);
    };

    const handleFetchHistory = async () => {
        if (!hasScope) {
            message.error('Workspace scope is not available yet.');
            return;
        }
        dispatch(startLoader("Fetching Jobs..."))
        try {
            const jobs = await getPreviousIngestionJobs(scope);
            setPreviousJobs(jobs);
        } catch (error) {
            message.error('Failed to fetch job history.');
        } finally {
            setisHistoryfetched(true)
            dispatch(stopLoader("Fetching Jobs..."))
        }
    };

    const renderContent = () => {
        if (!activeJob) {
            return (
                <Card>
                    <Empty
                        description={
                            <>
                                <Title level={4}>No Active Content Generation Job</Title>
                                <Paragraph>Get started by uploading your source files.</Paragraph>
                            </>
                        }
                    >
                        <Flex align='center' justify='center' gap="middle">
                            <Button type="primary" icon={<LuPlus />} disabled={!hasScope} onClick={() => setIsUploadModalVisible(true)}>
                                Upload New Content
                            </Button>
                            {!isHistoryfetched && <Button onClick={handleFetchHistory}>View Previous Job History</Button>}
                        </Flex>
                    </Empty>
                </Card>
            );
        }

        return (
            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                <Col key={activeJob.id} span={24}>
                    <JobCard job={activeJob} onReviewClick={handleReviewClick} />
                    {!isHistoryfetched && <Card style={{ marginTop: 24 }}>
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Paragraph>Your previous job history will be displayed here.</Paragraph>}>
                            <Flex align='center' justify='center' gap="middle">
                                <Button icon={<LuEye />} onClick={handleFetchHistory}>View</Button>
                            </Flex>
                        </Empty>
                    </Card>}
                </Col>
            </Row>
        );
    };

    return (
        <Layout style={{ height: '100%', padding: isMobile ? 12 : 24 }}>
            <Content>
                <Flex vertical gap={4} style={{ marginBottom: 16 }}>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Import Knowledge</Title>
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                        Upload source content, review generated articles, resolve duplicates, and publish only what should answer customers.
                    </Paragraph>
                </Flex>
                {!hasScope && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message="Workspace scope is not available"
                        description="Sign in to a Canonica workspace before starting a knowledge import."
                    />
                )}
                {renderContent()}
                {Boolean(previousJobs) && isHistoryfetched && <JobHistory jobs={previousJobs} onCardClick={handleCardClick} />}
            </Content>

            <UploadModal
                open={isUploadModalVisible}
                onClose={() => setIsUploadModalVisible(false)}
            />

            <ReviewModal
                open={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                job={activeJob}
                articlesToReview={articlesToReview}
                onReconciliationRequired={() => setShowReconciliationModal(true)}
            />

            <ReconciliationModal
                open={showReconciliationModal}
                onClose={() => setShowReconciliationModal(false)}
                job={activeJob}
                articlesToReview={articlesToReview}
            />

            <JobDetailsDrawer
                open={isDrawerVisible}
                onClose={() => setIsDrawerVisible(false)}
                job={selectedJob}
            />

        </Layout>
    );
}

export default KBGenerationTemplate;
