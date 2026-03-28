
import { ECOMSAI_PLATFORM_STORE_ID } from '@constant/user';
import useAnalyticsData from '@hook/useAnalyticsData';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Alert, Card, Col, DatePicker, Empty, Row, Space, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useContext, useState } from 'react';
import OverallMetrics from './OverallMetrics';

const TrendAnalysis = dynamic(() => import('./TrendAnalysis'), { ssr: false, loading: () => <Spin /> });
const TopItems = dynamic(() => import('./TopItems'), { ssr: false, loading: () => <Spin /> });
const DeviceBreakdown = dynamic(() => import('./DeviceBreakdown'), { ssr: false, loading: () => <Spin /> });
const LocationBreakdown = dynamic(() => import('./LocationBreakdown'), { ssr: false, loading: () => <Spin /> });
const SourceBreakdown = dynamic(() => import('./SourceBreakdown'), { ssr: false, loading: () => <Spin /> });
const MediumBreakdown = dynamic(() => import('./MediumBreakdown'), { ssr: false, loading: () => <Spin /> });
const CampaignBreakdown = dynamic(() => import('./CampaignBreakdown'), { ssr: false, loading: () => <Spin /> });

const { Title } = Typography;
const { RangePicker } = DatePicker;

function AnalyticsDashboard() {
    const t = useTranslations('Dashboard');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [dateRange, setDateRange] = useState({
        startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD')
    });

    const { data, loading, error } = useAnalyticsData(dateRange);

    const handleDateRangeChange = (dates: any) => {
        if (dates && dates.length === 2) {
            setDateRange({
                startDate: dates[0].format('YYYY-MM-DD'),
                endDate: dates[1].format('YYYY-MM-DD')
            });
        }
    };

    if (!(storeDetails?.storeId || storeDetails?.tenantId === ECOMSAI_PLATFORM_STORE_ID)) {
        return (
            <Card>
                <Empty description={t('noStoreSelected' as any)} />
            </Card>
        );
    }

    return (
        <div className="analytics-dashboard">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card>
                    <Row justify="space-between" align="middle">
                        <Col>
                        </Col>
                        <Col>
                            <RangePicker
                                defaultValue={[
                                    dayjs(dateRange.startDate),
                                    dayjs(dateRange.endDate)
                                ]}
                                onChange={handleDateRangeChange}
                                allowClear={false}
                            />
                        </Col>
                    </Row>
                </Card>

                {loading ? (
                    <Card>
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <Spin size="large" />
                            <div style={{ marginTop: '20px' }}>{t('loadingAnalytics' as any)}</div>
                        </div>
                    </Card>
                ) : error ? (
                    <Card>
                        <Alert
                            message={t('errorLoadingAnalytics' as any)}
                            description={error.message}
                            type="error"
                            showIcon
                        />
                    </Card>
                ) : (
                    <>
                        <OverallMetrics data={data} />

                        <Row gutter={[16, 16]}>
                            <Col xs={24} lg={16}>
                                <TrendAnalysis dailyData={data?.daily || []} />
                            </Col>
                            <Col xs={24} lg={8}>
                                <TopItems data={data} />
                            </Col>
                        </Row>

                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                                <DeviceBreakdown data={data} />
                            </Col>
                            <Col xs={24} md={12}>
                                <LocationBreakdown data={data} />
                            </Col>
                        </Row>

                        <Row gutter={[16, 16]}>
                            <Col xs={24} lg={8}>
                                <SourceBreakdown data={data} />
                            </Col>
                            <Col xs={24} lg={8}>
                                <MediumBreakdown data={data} />
                            </Col>
                            <Col xs={24} lg={8}>
                                <CampaignBreakdown data={data} />
                            </Col>
                        </Row>
                    </>
                )}
            </Space>
        </div>
    );
}

export default AnalyticsDashboard;