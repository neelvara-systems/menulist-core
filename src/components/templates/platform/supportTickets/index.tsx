
'use client';

import { getDeletedSupportTickets, subscribeSupportTickets } from '@database/tickets';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useTicketCache } from '@hook/useTicketCache';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { SupportTicketType } from '@type/supportTicket';
import { exportToCSV } from '@util/exportUtils';
import { Badge, Button, Card, Flex, message, Segmented, Space, Spin, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuBarChart2, LuDownload, LuLayoutGrid, LuTrash2 } from 'react-icons/lu';
import AnalyticsView from './AnalyticsView';
import { ticketAnalyticsColumns, ticketCSVColumns } from './exportConfig';
import PlatformTicketsView, { PlatformTicketsViewRef } from './PlatformTicketsView';

const { Title } = Typography;

const SupportTickets = () => {
    const [activeView, setActiveView] = useState<string>('analytics');
    const [tickets, setTickets] = useState<SupportTicketType[]>([]);
    const [deletedTickets, setDeletedTickets] = useState<SupportTicketType[]>([]);
    const [loading, setLoading] = useState(true);
    const dispatch = useAppDispatch();
    const ticketsViewRef = useRef<PlatformTicketsViewRef>(null);
    const deletedTicketsViewRef = useRef<PlatformTicketsViewRef>(null);
    const { cachedItems, setAllItems } = useTicketCache({ audience: 'platform' });
    const cachedTicketsOnMountRef = useRef<SupportTicketType[]>(cachedItems || []);
    const componentActiveRef = useRef(true);
    const deletedTicketsLoadInFlightRef = useRef(false);

    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);

    // Helper function to update both state and cache
    const updateTicketsAndCache = useCallback((updatedTickets: SupportTicketType[]) => {
        setTickets(updatedTickets);
        setAllItems(updatedTickets);
    }, [setAllItems]);

    // Support tickets use one live snapshot as the initial load.
    // This avoids paying for both getDocs() and onSnapshot() on mount.
    useEffect(() => {
        let mounted = true;
        let loaderActive = false;
        let unsubscribe: (() => void) | null = null;
        const cachedTickets = cachedTicketsOnMountRef.current;
        const shouldShowLoader = cachedTickets.length === 0;

        if (cachedTickets.length > 0) {
            setTickets(cachedTickets);
            setLoading(false);
        } else {
            loaderActive = true;
            dispatch(startLoader('Loading tickets...'));
        }

        const stopInitialLoader = () => {
            if (loaderActive) {
                dispatch(stopLoader('Loading tickets...'));
                loaderActive = false;
            }
        };

        const setupListener = async () => {
            let listener: (() => void) | null = null;
            try {
                listener = await subscribeSupportTickets(
                    (updatedTickets) => {
                        if (!mounted) return;
                        updateTicketsAndCache(updatedTickets);
                        setLoading(false);
                        stopInitialLoader();
                    },
                    () => {
                        if (!mounted) return;
                        message.error('Failed to sync tickets in real-time');
                        setLoading(false);
                        stopInitialLoader();
                    }
                );
            } catch {
                if (!mounted) return;
                message.error('Failed to sync tickets in real-time');
                setLoading(false);
                stopInitialLoader();
                return;
            }

            if (!mounted) {
                listener?.();
                return;
            }

            unsubscribe = listener;
        };

        void setupListener();

        return () => {
            mounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
            if (shouldShowLoader) {
                stopInitialLoader();
            }
        };
    }, [dispatch, updateTicketsAndCache]);

    // Fetch deleted tickets when trash view is accessed
    const fetchDeletedTickets = useCallback(async () => {
        if (deletedTicketsLoadInFlightRef.current) return;
        deletedTicketsLoadInFlightRef.current = true;
        dispatch(startLoader('Loading deleted tickets...'));
        try {
            const response = await getDeletedSupportTickets(100);
            if (componentActiveRef.current) setDeletedTickets(response);
        } catch {
            if (componentActiveRef.current) message.error('Failed to load deleted tickets.');
        } finally {
            deletedTicketsLoadInFlightRef.current = false;
            dispatch(stopLoader('Loading deleted tickets...'));
        }
    }, [dispatch]);

    // Fetch deleted tickets when switching to trash view
    useEffect(() => {
        if (activeView === 'trash') {
            void fetchDeletedTickets();
        }
    }, [activeView, fetchDeletedTickets]);

    const options = [
        {
            label: (
                <div style={{ padding: '4px 8px' }}>
                    <LuBarChart2 style={{ marginRight: 8 }} />
                    Dashboard
                </div>
            ),
            value: 'analytics',
        },
        {
            label: (
                <div style={{ padding: '4px 8px' }}>
                    <LuLayoutGrid style={{ marginRight: 8 }} />
                    Ticket Queue
                </div>
            ),
            value: 'queue',
        },
        {
            label: (
                <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LuTrash2 style={{ marginRight: 8 }} />
                    Deleted
                    {deletedTickets?.length > 0 && (
                        <Badge count={deletedTickets?.length} showZero={false} style={{ marginLeft: 4 }} />
                    )}
                </div>
            ),
            value: 'trash',
        },
    ];

    const handleExportAnalytics = () => {
        exportToCSV(tickets, ticketAnalyticsColumns, {
            filename: `ticket-analytics-${new Date().toISOString().split('T')[0]}`,
        });
    };

    const handleExportTickets = () => {
        const filteredTickets = ticketsViewRef.current?.exportFilteredTickets() || tickets;
        exportToCSV(filteredTickets, ticketCSVColumns, {
            filename: `support-tickets-${new Date().toISOString().split('T')[0]}`,
        });
    };

    if (loading) {
        return <Spin tip="Loading tickets..." fullscreen />;
    }

    return (
        <Card variant='borderless' style={{ width: '100%' }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Support Tickets</Title>
                <Space size={12}>
                    <Segmented
                        options={options}
                        value={activeView}
                        onChange={(value) => setActiveView(value as string)}
                    />
                    {activeView === 'analytics' ? (
                        <Button icon={<LuDownload />} onClick={handleExportAnalytics}>
                            Export Analytics
                        </Button>
                    ) : activeView === 'trash' ? (
                        <Button icon={<LuDownload />} onClick={() => {
                            const filteredTickets = deletedTicketsViewRef.current?.exportFilteredTickets() || deletedTickets;
                            exportToCSV(filteredTickets, ticketCSVColumns, {
                                filename: `deleted-tickets-${new Date().toISOString().split('T')[0]}`,
                            });
                        }}>
                            Export Deleted
                        </Button>
                    ) : (
                        <Button icon={<LuDownload />} onClick={handleExportTickets}>
                            Export Tickets
                        </Button>
                    )}
                </Space>
            </Flex>

            {activeView === 'queue' ? (
                <PlatformTicketsView
                    ref={ticketsViewRef}
                    tickets={tickets}
                    onTicketsUpdate={updateTicketsAndCache}
                />
            ) : activeView === 'trash' ? (
                <PlatformTicketsView
                    ref={deletedTicketsViewRef}
                    tickets={deletedTickets}
                    onTicketsUpdate={(updated) => {
                        setDeletedTickets(updated);
                        // Active tickets are already maintained by the live listener.
                        // Refresh only the lazy-loaded trash view after restore/delete actions.
                        void fetchDeletedTickets();
                    }}
                    isTrashView={true}
                />
            ) : (
                <AnalyticsView tickets={tickets} />
            )}
        </Card>
    );
};

export default SupportTickets;
