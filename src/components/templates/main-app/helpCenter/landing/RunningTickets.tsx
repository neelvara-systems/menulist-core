'use client'
import { helpCenterTabRouting } from '@constant/navigations';
import { Button, Card, Col, Empty, Flex, message, Row, Tooltip, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { getStoresTickets, subscribeTicketById } from '@database/tickets';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useTicketCache } from '@hook/useTicketCache';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import TicketDetailView from '@template/platform/supportTickets/TicketDetailView';
import { SUPPORT_TICKET_STATUS, SupportTicketType } from '@type/supportTicket';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuArrowRight } from 'react-icons/lu';
import TicketItem from '../TicketItem';

function RunningTickets() {
    const t = useTranslations('HelpCenter');
    const router = useRouter();
    const { setAllItems, updateItem, cachedItems } = useTicketCache();
    const dispatch = useAppDispatch();
    const [selectedTicket, setSelectedTicket] = useState<SupportTicketType | null>(null);
    const cachedTicketsOnMountRef = useRef<SupportTicketType[]>(cachedItems || []);

    const onTicketSubmitted = (ticket: SupportTicketType) => {
        updateItem(ticket, 'first', 'displayId');

        // Close the drawer if ticket was closed
        if (ticket.status === SUPPORT_TICKET_STATUS.CLOSED) {
            setSelectedTicket(null);
        }
    };

    // Landing summary only needs an initial snapshot; the full ticket tab owns live updates.
    useEffect(() => {
        if (cachedTicketsOnMountRef.current.length > 0) return;

        let mounted = true;
        let loaderActive = true;
        if (loaderActive) {
            dispatch(startLoader("Fetching ticket history..."));
        }

        const stopInitialLoader = () => {
            if (loaderActive) {
                dispatch(stopLoader("Fetching ticket history..."));
                loaderActive = false;
            }
        };

        const loadTicketSummary = async () => {
            try {
                const tickets = await getStoresTickets();
                if (!mounted) return;
                setAllItems(tickets as SupportTicketType[]);
                stopInitialLoader();
            } catch (error) {
                if (!mounted) return;
                stopInitialLoader();
                message.error(t('failedToLoadTickets'));
            }
        };

        loadTicketSummary();

        return () => {
            mounted = false;
            stopInitialLoader();
        };
    }, [dispatch, setAllItems, t]);

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

    if (tickets?.length === 0) {
        return null;
    }

    return (
        <Card variant='borderless' style={cardStyle}>
            <Flex vertical gap="small">
                <Flex justify="space-between" align="center">
                    <Typography.Title level={4} style={titleStyle}>{t('yourTickets')}</Typography.Title>
                    <Tooltip title="View all your support tickets and submit new requests">
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
                <Typography.Text type='secondary'>Here&apos;s a quick summary of your ongoing conversations with our support team.</Typography.Text>
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
