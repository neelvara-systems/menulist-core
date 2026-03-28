import { useTicketCache } from '@hook/useTicketCache';
import TicketDetailView from '@template/platform/supportTickets/TicketDetailView';
import { SupportTicketType } from '@type/supportTicket';
import { Flex } from 'antd';
import { useMemo, useState } from 'react';
import TicketItem from './TicketItem';

const TicketHistoryView = ({ tickets }: { tickets: SupportTicketType[] }) => {
    const [selectedTicket, setSelectedTicket] = useState<SupportTicketType | null>(null);
    const { updateItem } = useTicketCache();

    const onTicketSubmitted = (ticket: SupportTicketType) => {
        updateItem(ticket, 'first', 'displayId');
    };

    // Memoize style to prevent re-renders
    const flexStyle = useMemo(() => ({ width: '100%' }), []);
    
    // Get the latest version of selectedTicket from tickets prop
    const activeTicket = selectedTicket ? tickets.find(t => t.id === selectedTicket.id) || selectedTicket : null;

    return (
        <>
            <Flex vertical gap={12} style={flexStyle}>
                {tickets.map((ticket: SupportTicketType) => (
                    <TicketItem
                        key={ticket.id}
                        ticket={ticket}
                        onClick={() => setSelectedTicket(ticket)}
                    />
                ))}
            </Flex>
            <TicketDetailView
                from="client"
                activeTicket={activeTicket}
                onUpdate={onTicketSubmitted}
                setSelectedTicket={setSelectedTicket}
            />
        </>
    );
};

export default TicketHistoryView;
