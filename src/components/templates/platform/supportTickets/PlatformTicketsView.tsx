'use client';

import { assertSupportTicketUpdateSucceeded, updateTicket } from '@database/tickets';
import { useAppDispatch } from '@hook/useAppDispatch';
import AddSupportTicket from '@organisms/addSupportTicket';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { calculateSLAStatus, SUPPORT_TICKET_PRIORITY, SUPPORT_TICKET_STATUS, SupportTicketType } from '@type/supportTicket';
import { updateList } from '@util/utils';
import { Flex, message, Table, theme, Typography } from 'antd';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import TicketDetailView from './TicketDetailView';
import TicketFiltersBar from './TicketFiltersBar';
import { getTicketTableColumns } from './TicketTableColumns';
const { Text } = Typography;

interface PlatformTicketsViewProps {
    tickets: SupportTicketType[];
    onTicketsUpdate: (tickets: SupportTicketType[]) => void;
    isTrashView?: boolean;
}

export interface PlatformTicketsViewRef {
    exportFilteredTickets: () => SupportTicketType[];
}

const PlatformTicketsView = forwardRef<PlatformTicketsViewRef, PlatformTicketsViewProps>(({ tickets, onTicketsUpdate, isTrashView = false }, ref) => {
    const { token } = theme.useToken();
    const dispatch = useAppDispatch();
    const [searchTerm, setSearchTerm] = useState('');
    const [drawerState, setDrawerState] = useState<{ mode: 'view' | 'edit'; selectedTicket: SupportTicketType | null; }>({ mode: 'edit', selectedTicket: null });
    const [isModalVisible, setIsModalVisible] = useState(false);


    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        category: '',
        client: '',  // Filter by store name
        dateRange: null as [any, any] | null,
        tags: [] as string[],
        slaStatus: '',  // 'breached', 'at_risk', 'on_time'
        longRunning: false,  // Show only long-running tickets (>3 days old)
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Get unique clients from tickets
    const uniqueClients = useMemo(() => {
        const clientSet = new Set<string>();
        tickets.forEach(ticket => {
            if (ticket.clientDetails?.storeName) {
                clientSet.add(ticket.clientDetails.storeName);
            }
        });
        return Array.from(clientSet).sort((a, b) => a.localeCompare(b));
    }, [tickets]);

    const filteredTickets = useMemo(() => {
        return tickets?.filter(ticket => {
            const searchMatch = searchTerm.toLowerCase();
            const matchesSearch = (
                ticket.displayId.toLowerCase().includes(searchMatch) ||
                ticket.subject.toLowerCase().includes(searchMatch) ||
                ticket.clientDetails?.storeName?.toLowerCase()?.includes(searchMatch) ||
                ticket.clientDetails?.tenantName?.toLowerCase()?.includes(searchMatch) ||
                ticket.clientDetails?.email?.toLowerCase()?.includes(searchMatch) ||
                ticket.clientDetails?.phone?.toLowerCase()?.includes(searchMatch)
            );

            const matchesFilters =
                (filters.status ? ticket.status === filters.status : true) &&
                (filters.priority ? ticket.priority === filters.priority : true) &&
                (filters.category ? ticket.category === filters.category : true) &&
                (filters.client ? ticket.clientDetails?.storeName === filters.client : true);

            // Date range filter
            const matchesDateRange = filters.dateRange
                ? ticket.createdOn &&
                ticket.createdOn.toMillis() >= filters.dateRange[0]?.valueOf() &&
                ticket.createdOn.toMillis() <= filters.dateRange[1]?.valueOf()
                : true;

            // Tags filter
            const matchesTags = filters.tags.length > 0
                ? filters.tags.some(tag => ticket.platformTags?.includes(tag))
                : true;

            // SLA Status filter
            let matchesSLA = true;
            if (filters.slaStatus && ticket.createdOn) {
                const hasResponse = ticket.messages && ticket.messages.length > 1;
                const isResolved = ticket.status === SUPPORT_TICKET_STATUS.RESOLVED || ticket.status === SUPPORT_TICKET_STATUS.CLOSED;
                const sla = calculateSLAStatus(ticket.createdOn, ticket.priority, hasResponse, isResolved);
                matchesSLA = sla.resolutionStatus === filters.slaStatus;
            }

            // Long-running filter (>3 days old and not resolved)
            const matchesLongRunning = filters.longRunning
                ? ticket.createdOn &&
                (Date.now() - ticket.createdOn.toMillis()) > (3 * 24 * 60 * 60 * 1000) &&
                ticket.status !== SUPPORT_TICKET_STATUS.RESOLVED &&
                ticket.status !== SUPPORT_TICKET_STATUS.CLOSED
                : true;

            return matchesSearch && matchesFilters && matchesDateRange && matchesTags && matchesSLA && matchesLongRunning;
        });
    }, [tickets, searchTerm, filters]);

    // Expose export method to parent
    useImperativeHandle(ref, () => ({
        exportFilteredTickets: () => {
            // This will be called from parent to export filtered tickets
            return filteredTickets;
        }
    }), [filteredTickets]);

    // Handler: Soft delete ticket
    const handleDelete = async (ticket: SupportTicketType) => {
        dispatch(startLoader('Deleting ticket...'));
        try {
            const result = await updateTicket({
                id: ticket.id,
                deleted: true,
                tId: ticket.tId,
                sId: ticket.sId,
            });
            assertSupportTicketUpdateSucceeded(
                result,
                ticket.id,
                'platform_ticket_soft_delete_rejected',
            );

            // Update local state by removing the ticket
            const updatedTickets = tickets.filter(t => t.id !== ticket.id);
            onTicketsUpdate(updatedTickets);

            message.success(`Ticket ${ticket.displayId} deleted successfully`);
        } catch (error) {
            message.error('Failed to delete ticket. Please try again.');
        } finally {
            dispatch(stopLoader('Deleting ticket...'));
        }
    };

    // Handler: Restore deleted ticket
    const handleRestore = async (ticket: SupportTicketType) => {
        dispatch(startLoader('Restoring ticket...'));
        try {
            const result = await updateTicket({
                id: ticket.id,
                deleted: false,
                tId: ticket.tId,
                sId: ticket.sId,
            });
            assertSupportTicketUpdateSucceeded(
                result,
                ticket.id,
                'platform_ticket_restore_rejected',
            );

            // Update local state by removing from deleted list
            const updatedTickets = tickets.filter(t => t.id !== ticket.id);
            onTicketsUpdate(updatedTickets);

            message.success(`Ticket ${ticket.displayId} restored successfully`);
        } catch (error) {
            message.error('Failed to restore ticket. Please try again.');
        } finally {
            dispatch(stopLoader('Restoring ticket...'));
        }
    };

    // Get table columns with actions
    const columns = getTicketTableColumns({
        token,
        onView: (ticket: SupportTicketType) => setDrawerState({ mode: 'view', selectedTicket: ticket }),
        onEdit: (ticket: SupportTicketType) => setDrawerState({ mode: 'edit', selectedTicket: ticket }),
        onDelete: isTrashView ? undefined : handleDelete,
        onRestore: isTrashView ? handleRestore : undefined,
        isTrashView,
    });

    return (
        <Flex vertical gap={24}>
            {/* Filters Bar */}
            <TicketFiltersBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filters={filters}
                onFilterChange={handleFilterChange}
                onFiltersUpdate={setFilters}
                onNewTicket={isTrashView ? undefined : () => setIsModalVisible(true)}
                isTrashView={isTrashView}
                availableClients={uniqueClients}
            />
            {/* Tickets Table */}
            {/* <Card variant='borderless' style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}> */}
            <Table
                loading={false}
                columns={columns}
                dataSource={filteredTickets}
                rowKey="id"
                scroll={{ x: 1000 }}
                pagination={{
                    pageSize: 15,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '15', '25', '50'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                    style: { marginTop: 16 }
                }}
                onRow={(record) => ({
                    onClick: () => {
                        setDrawerState({ mode: 'edit', selectedTicket: record });
                    },
                    style: {
                        cursor: 'pointer',
                        ...(record.priority === SUPPORT_TICKET_PRIORITY.HIGH && {
                            backgroundColor: token.colorErrorBg
                        })
                    }
                })}
                rowClassName={(record) =>
                    record.priority === SUPPORT_TICKET_PRIORITY.HIGH ? 'high-priority-row' : ''
                }
                locale={{
                    emptyText: (
                        <Flex vertical align="center" gap={12} style={{ padding: '60px 20px' }}>
                            <LuSearch size={48} style={{ opacity: 0.15 }} />
                            <Text type="secondary" style={{ fontSize: 16 }}>No tickets found</Text>
                            <Text type="secondary" style={{ fontSize: 13 }}>Try adjusting your search or filters</Text>
                        </Flex>
                    )
                }}
            />
            {/* </Card> */}

            {drawerState.selectedTicket && (
                <TicketDetailView
                    activeTicket={drawerState.selectedTicket}
                    setSelectedTicket={(ticket) => {
                        if (!ticket) {
                            // Close drawer and reset to default mode
                            setDrawerState({ mode: 'edit', selectedTicket: null });
                        } else {
                            // Update ticket but keep current mode
                            setDrawerState(prev => ({ ...prev, selectedTicket: ticket }));
                        }
                    }}
                    onUpdate={(updatedTicket) => {
                        onTicketsUpdate(updateList(tickets, updatedTicket));
                        // Update selected ticket in drawer state
                        setDrawerState(prev => ({ ...prev, selectedTicket: updatedTicket }));
                    }}
                    from={drawerState.mode === 'view' ? 'client' : 'platform'}
                />
            )}

            <AddSupportTicket
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                onTicketSubmitted={(newTicket) => {
                    onTicketsUpdate([newTicket, ...tickets]);
                    setIsModalVisible(false);
                }}
            />

            <style jsx global>{`
                .high-priority-row:hover td {
                    background-color: ${token.colorErrorBgHover} !important;
                }
            `}</style>
        </Flex>
    );
});

PlatformTicketsView.displayName = 'PlatformTicketsView';

export default PlatformTicketsView;
