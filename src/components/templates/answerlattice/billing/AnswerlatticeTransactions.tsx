'use client';

import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/navigations';
import { getAnswerlatticeBillingHistoryForStore } from '@database/answerlattice/billing';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { formatBillingHistoryEvents } from '@lib/billing/billingHistoryFormatter';
import { logger } from '@lib/monitoring/logger';
import type { BillingHistoryItem } from '@type/razorpay';
import { Alert, Button, Card, Flex, Grid, Spin, Typography, message } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuArrowLeft, LuRefreshCw } from 'react-icons/lu';
import BillingHistory from '@/components/templates/main-app/billing/BillingHistory';

const { Title, Text } = Typography;

const getCurrentHostname = () => (typeof window === 'undefined' ? undefined : window.location.hostname);

export default function AnswerlatticeTransactions() {
    const { data: session, status } = useSession();
    const scope = useMemo(() => resolveAnswerlatticeSessionScope(session), [session]);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const formatter = useFormatter();
    const router = useRouter();
    const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const currentHostname = getCurrentHostname();

    const fetchBillingHistory = useCallback(async () => {
        if (!scope?.tenantId || !scope?.storeId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const rawHistory = await getAnswerlatticeBillingHistoryForStore(scope.tenantId, scope.storeId);
            setBillingHistory(formatBillingHistoryEvents(rawHistory, {
                formatBillingCycle: (startSeconds, endSeconds) => {
                    if (!startSeconds || !endSeconds) return undefined;
                    const startDate = formatter.dateTime(new Date(startSeconds * 1000), { year: 'numeric', month: 'short', day: 'numeric' });
                    const endDate = formatter.dateTime(new Date(endSeconds * 1000), { year: 'numeric', month: 'short', day: 'numeric' });
                    return `${startDate}-${endDate}`;
                },
            }));
        } catch (error) {
            logger.error('Failed to load Answerlattice transactions', error);
            message.error('Could not load Answerlattice transactions.');
        } finally {
            setIsLoading(false);
        }
    }, [formatter, scope?.tenantId, scope?.storeId]);

    useEffect(() => {
        if (status === 'loading') return;
        void fetchBillingHistory();
    }, [fetchBillingHistory, status]);

    return (
        <Flex vertical gap={16} style={{ width: '100%', paddingBottom: isMobile ? 'calc(24px + env(safe-area-inset-bottom))' : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'flex-start'} justify="space-between" gap={16} vertical={isMobile} wrap={!isMobile}>
                <Flex vertical gap={4}>
                    <Title level={isMobile ? 4 : 2} style={{ margin: 0 }}>Transactions</Title>
                    <Text type="secondary">Invoices, subscription charges, and Answerlattice support credit purchases.</Text>
                </Flex>
                <Flex gap={8} wrap>
                    <Button icon={<LuArrowLeft />} onClick={() => router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.BILLING, currentHostname))}>
                        Billing
                    </Button>
                    <Button icon={<LuRefreshCw />} onClick={() => void fetchBillingHistory()}>
                        Refresh
                    </Button>
                </Flex>
            </Flex>

            {!scope ? (
                <Alert type="warning" showIcon message="Answerlattice account scope is missing" />
            ) : null}

            {isLoading ? (
                <Card>
                    <Flex align="center" justify="center" gap={12} style={{ minHeight: 160 }}>
                        <Spin />
                        <Text type="secondary">Loading transactions...</Text>
                    </Flex>
                </Card>
            ) : (
                <BillingHistory billingHistory={billingHistory} fetchBillingHistory={fetchBillingHistory} />
            )}
        </Flex>
    );
}
