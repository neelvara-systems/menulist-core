import { subscribeStoreTickets } from '@database/tickets';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useTicketCache } from '@hook/useTicketCache';
import AddSupportTicket from '@organisms/addSupportTicket';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { SupportTicketType } from '@type/supportTicket';
import { Badge, Card, Flex, Tooltip, Typography, message, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuHistory, LuMessageSquare, LuWifi } from 'react-icons/lu';
import TicketHistoryView from './TicketHistoryView';

const { Title, Paragraph } = Typography;

function TicketView() {
    const t = useTranslations('HelpCenter');
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();
    const { getAllItems, setAllItems, updateItem, cachedItems } = useTicketCache();
    const [initialFetchDone, setInitialFetchDone] = useState(false);
    const [isRealtimeActive, setIsRealtimeActive] = useState(false);

    const fetchTickets = async () => {
        dispatch(startLoader("Fetching your requests..."))
        try {
            await getAllItems();
            setInitialFetchDone(true);
        } catch (error) {
            message.error(t('unableToLoadRequests'));
        } finally {
            dispatch(stopLoader("Fetching your requests..."));
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        fetchTickets();
    }, []);

    // Real-time listener - only active when on tickets tab
    useEffect(() => {
        if (!initialFetchDone) return; // Wait for initial fetch

        let unsubscribe: (() => void) | undefined;

        const setupRealtimeSync = async () => {
            try {
                unsubscribe = await subscribeStoreTickets(
                    (tickets) => {
                        // Update cache with real-time data
                        setAllItems(tickets);
                        setIsRealtimeActive(true);
                    },
                    (error) => {
                        setIsRealtimeActive(false);
                        // Don't show error to user - fallback to cached data
                    }
                );
                setIsRealtimeActive(true);
            } catch (error) {
                setIsRealtimeActive(false);
            }
        };

        setupRealtimeSync();

        // Cleanup subscription when component unmounts or navigates away
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
            setIsRealtimeActive(false);
        };
    }, [initialFetchDone, setAllItems]);


    const onTicketSubmitted = (ticket: SupportTicketType) => {
        updateItem(ticket, 'first', 'displayId');
        message.success(t('requestSubmitted'));
    };

    // Memoize styles to prevent re-renders
    const flexContainerStyle = useMemo(() => ({
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 24px'
    }), []);

    const leftCardStyle = useMemo(() => ({
        flex: '1 1 600px',
        maxWidth: 700,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadow,
        padding: 4,
    }), [token.borderRadiusLG, token.boxShadow]);

    const rightCardStyle = useMemo(() => ({
        flex: '0 1 450px',
        minWidth: 380,
        maxWidth: 480,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadow,
        padding: 4,
        maxHeight: 'calc(100vh - 140px)',
        overflow: 'auto'
    }), [token.borderRadiusLG, token.boxShadow]);

    const titleMarginStyle = useMemo(() => ({ margin: 0 }), []);
    const paragraphStyle = useMemo(() => ({ margin: 0, color: token.colorTextSecondary, fontSize: 14 }), [token.colorTextSecondary]);

    return (
        <Flex
            gap={24}
            wrap="wrap"
            align="flex-start"
            justify="center"
            style={flexContainerStyle}
        >
            {/* Left: New Request Form */}
            <Card
                variant='borderless'
                style={leftCardStyle}
            >
                <Flex vertical gap={24}>
                    <Flex align="center" gap={12}>
                        <LuMessageSquare size={24} color={token.colorPrimary} />
                        <div>
                            <Title level={3} style={titleMarginStyle}>{t('needHelp')}</Title>
                            <Paragraph style={paragraphStyle}>
                                {t('needHelpDesc')}
                            </Paragraph>
                        </div>
                    </Flex>

                    <AddSupportTicket
                        mode="form"
                        visible={false}
                        onClose={() => { }}
                        onTicketSubmitted={onTicketSubmitted}
                        showHeader={false}
                    />
                </Flex>
            </Card>

            {/* Right: Previous Requests */}
            {cachedItems && cachedItems.length > 0 && (
                <Card
                    variant='borderless'
                    style={rightCardStyle}
                >
                    <Flex vertical gap={16}>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={12}>
                                <LuHistory size={24} color={token.colorPrimary} />
                                <Title level={4} style={titleMarginStyle}>{t('yourSupportTickets')}</Title>
                            </Flex>

                            {/* Real-time sync indicator */}
                            {isRealtimeActive && (
                                <Tooltip title={t('liveUpdatesActive')}>
                                    <Badge
                                        status="success"
                                        text={
                                            <Flex align="center" gap={4}>
                                                <LuWifi size={12} />
                                                <span style={{ fontSize: 12 }}>{t('live')}</span>
                                            </Flex>
                                        }
                                    />
                                </Tooltip>
                            )}
                        </Flex>

                        <TicketHistoryView tickets={cachedItems} />
                    </Flex>
                </Card>
            )}
        </Flex>
    )
}

export default TicketView