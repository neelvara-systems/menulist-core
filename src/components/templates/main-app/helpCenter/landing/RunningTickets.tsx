'use client'
import { helpCenterTabRouting } from '@constant/navigations';
import { Alert, Button, Card, Col, Empty, Flex, App, Row, Tooltip, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { getStoresTickets, subscribeTicketById } from '@database/tickets';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useTicketCache } from '@hook/useTicketCache';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import TicketDetailView from '@template/platform/supportTickets/TicketDetailView';
import { SUPPORT_TICKET_STATUS, SupportTicketType } from '@type/supportTicket';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuArrowRight, LuRefreshCw } from 'react-icons/lu';
import TicketItem from '../TicketItem';

const TICKET_SUMMARY_LOADER_KEY = 'helpCenterTicketSummary';

function RunningTickets() {
    const { message: messageApi } = App.useApp();
    const t = useTranslations('HelpCenter');
    const router = useRouter();
    const { setAllItems, updateItem, cachedItems } = useTicketCache();
    const dispatch = useAppDispatch();
    const [selectedTicket, setSelectedTicket] = useState<SupportTicketType | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const cachedTicketsOnMountRef = useRef<SupportTicketType[]>(cachedItems || []);
    const loadRequestRef = useRef(0);

    const onTicketSubmitted = (ticket: SupportTicketType) => {
        updateItem(ticket, 'first', 'displayId');

        // Close the drawer if ticket was closed
        if (ticket.status === SUPPORT_TICKET_STATUS.CLOSED) {
            setSelectedTicket(null);
        }
    };

    const loadTicketSummary = useCallback(async () => {
        const requestId = ++loadRequestRef.current;
        setLoadFailed(false);
        dispatch(startLoader(TICKET_SUMMARY_LOADER_KEY));
        try {
            const tickets = await getStoresTickets();
            if (requestId !== loadRequestRef.current) return;
            setAllItems(tickets as SupportTicketType[]);
        } catch {
            if (requestId !== loadRequestRef.current) return;
            setLoadFailed(true);
            messageApi.error(t('failedToLoadTickets'));
        } finally {
            if (requestId === loadRequestRef.current) {
                dispatch(stopLoader(TICKET_SUMMARY_LOADER_KEY));
            }
        }
    }, [dispatch, setAllItems, t]);

    // Landing summary only needs an initial snapshot; the full ticket tab owns live updates.
    useEffect(() => {
        if (cachedTicketsOnMountRef.current.length > 0) return;

        void loadTicketSummary();

        return () => {
            loadRequestRef.current += 1;
            dispatch(stopLoader(TICKET_SUMMARY_LOADER_KEY));
        };
    }, [dispatch, loadTicketSummary]);

    useEffect(() => {
        if (!selectedTicket?.id) return;

        let mounted = true;
        let unsubscribe: (() => void) | null = null;

        const syncSelectedTicket = async () => {
            const nextUnsubscribe = await subscribeTicketById(
                selectedTicket.id,
                (ticket) => {
                    if (!mounted) return;
                    if (!ticket) {
                        setSelectedTicket(null);
                        return;
                    }
                    updateItem(ticket, 'first', 'displayId');
                    if (ticket.status === SUPPORT_TICKET_STATUS.CLOSED) {
                        setSelectedTicket(null);
                        return;
                    }
                    setSelectedTicket(ticket);
                },
            );
            if (!mounted) {
                nextUnsubscribe();
                return;
            }
            unsubscribe = nextUnsubscribe;
        };

        syncSelectedTicket();

        return () => {
            mounted = false;
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
        };
    }, [selectedTicket?.id, updateItem]);

    const tickets = cachedItems?.filter(ticket => ticket.status !== SUPPORT_TICKET_STATUS.CLOSED).slice(0, 3) || [];

    // Get the latest version of selectedTicket from cache
    const activeTicket = selectedTicket ? cachedItems?.find(t => t.id === selectedTicket.id) || selectedTicket : null;

    // Memoize styles to prevent re-renders
    const cardStyle = useMemo(() => ({ width: '100%' }), []);
    const titleStyle = useMemo(() => ({ margin: 0 }), []);

    if (tickets?.length === 0 && !loadFailed) {
        return null;
    }

    if (loadFailed) {
        return (
            <Card variant="borderless" style={cardStyle}>
                <Alert
                    action={(
                        <Button
                            aria-label={t('failedToLoadTickets')}
                            icon={<LuRefreshCw aria-hidden="true" />}
                            onClick={() => void loadTicketSummary()}
                            size="small"
                        />
                    )}
                    message={t('failedToLoadTickets')}
                    showIcon
                    type="error"
                />
            </Card>
        );
    }

    return (
        <Card variant='borderless' style={cardStyle}>
            <Flex vertical gap="small">
                <Flex justify="space-between" align="center">
                    <Typography.Title level={4} style={titleStyle}>{t('yourTickets')}</Typography.Title>
                    <Tooltip title={t('submitTicketDesc')}>
                        <Button
                            type='text'
                            size='small'
                            icon={<LuArrowRight />}
                            onClick={() => router.push(helpCenterTabRouting('ticket'))}
                        >
                            {t('viewAll')}
                        </Button>
                    </Tooltip>
                </Flex>
                {tickets?.length > 0 ?
                    <>
                        <Row gutter={[16, 16]}>
                            {tickets.map((ticket: SupportTicketType) => (
                                <Col key={ticket.id} xs={24} sm={12} md={8}>
                                    <TicketItem
                                        ticket={ticket}
                                        onClick={() => setSelectedTicket(ticket)}
                                    />
                                </Col>
                            ))}
                        </Row>
                        <TicketDetailView
                            from="client"
                            activeTicket={activeTicket}
                            onUpdate={onTicketSubmitted}
                            setSelectedTicket={setSelectedTicket}
                        />
                    </>
                    :
                    <Empty description={t('noTicketsYet')} />}
            </Flex>
        </Card>
    );
}

export default RunningTickets
