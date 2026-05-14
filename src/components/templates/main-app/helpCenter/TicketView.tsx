import { subscribeStoreTickets } from '@database/tickets';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useTicketCache } from '@hook/useTicketCache';
import AddSupportTicket from '@organisms/addSupportTicket';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { SupportTicketType } from '@type/supportTicket';
import { Badge, Card, Flex, Grid, Tooltip, Typography, message, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuHistory, LuMessageSquare, LuWifi } from 'react-icons/lu';
import TicketHistoryView from './TicketHistoryView';

const { Title, Paragraph } = Typography;

function TicketView() {
    const t = useTranslations('HelpCenter');
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const { setAllItems, updateItem, cachedItems } = useTicketCache();
    const [isRealtimeActive, setIsRealtimeActive] = useState(false);
    const cachedTicketsOnMountRef = useRef<SupportTicketType[]>(cachedItems || []);
    const isNarrow = screens.md !== true;

    // Store tickets use one live snapshot as the initial load.
    // This avoids paying for both getDocs() and onSnapshot() on mount.
    useEffect(() => {
        let mounted = true;
        let loaderActive = cachedTicketsOnMountRef.current.length === 0;
        let unsubscribe: (() => void) | undefined;

        if (loaderActive) {
            dispatch(startLoader("Fetching your requests..."));
        }

        const stopInitialLoader = () => {
            if (loaderActive) {
                dispatch(stopLoader("Fetching your requests..."));
                loaderActive = false;
            }
        };

        const setupRealtimeSync = async () => {
            try {
                unsubscribe = await subscribeStoreTickets(
                    (tickets) => {
                        if (!mounted) return;
                        setAllItems(tickets);
                        setIsRealtimeActive(true);
                        stopInitialLoader();
                    },
                    (error) => {
                        if (!mounted) return;
                        setIsRealtimeActive(false);
                        stopInitialLoader();
                        if (cachedTicketsOnMountRef.current.length === 0) {
                            message.error(t('unableToLoadRequests'));
                        }
                    }
                );
            } catch (error) {
                if (!mounted) return;
                setIsRealtimeActive(false);
                stopInitialLoader();
                if (cachedTicketsOnMountRef.current.length === 0) {
                    message.error(t('unableToLoadRequests'));
                }
            }
        };

        setupRealtimeSync();

        return () => {
            mounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
            stopInitialLoader();
            setIsRealtimeActive(false);
        };
    }, [dispatch, setAllItems, t]);


    const onTicketSubmitted = (ticket: SupportTicketType) => {
        updateItem(ticket, 'first', 'displayId');
        message.success(t('requestSubmitted'));
    };

    // Memoize styles to prevent re-renders
    const flexContainerStyle = useMemo(() => ({
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        padding: isNarrow ? 0 : '0 24px'
    }), [isNarrow]);

    const leftCardStyle = useMemo(() => ({
        flex: isNarrow ? '1 1 100%' : '1 1 600px',
        maxWidth: isNarrow ? '100%' : 700,
        minWidth: 0,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadow,
        padding: isNarrow ? 0 : 4,
    }), [isNarrow, token.borderRadiusLG, token.boxShadow]);

    const rightCardStyle = useMemo(() => ({
        flex: isNarrow ? '1 1 100%' : '0 1 450px',
        minWidth: isNarrow ? 0 : 380,
        maxWidth: isNarrow ? '100%' : 480,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadow,
        padding: 4,
        maxHeight: isNarrow ? 'none' : 'calc(100vh - 140px)',
        overflow: 'auto'
    }), [isNarrow, token.borderRadiusLG, token.boxShadow]);

    const titleMarginStyle = useMemo(() => ({ margin: 0 }), []);
    const paragraphStyle = useMemo(() => ({ margin: 0, color: token.colorTextSecondary, fontSize: 14 }), [token.colorTextSecondary]);

    return (
        <Flex
            gap={isNarrow ? 12 : 24}
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
