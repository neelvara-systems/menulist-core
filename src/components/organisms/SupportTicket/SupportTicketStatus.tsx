import { SUPPORT_TICKET_STATUS, SupportTicketType } from '@type/supportTicket';
import { Tag } from 'antd';

function SupportTicketStatus({ ticket }: { ticket: SupportTicketType }) {

    const getStatusColor = (status: string) => {
        switch (status) {
            case SUPPORT_TICKET_STATUS.IN_PROGRESS: return 'blue';
            case SUPPORT_TICKET_STATUS.RESOLVED: return 'success';
            case SUPPORT_TICKET_STATUS.CLOSED: return 'orange';
            case SUPPORT_TICKET_STATUS.RE_OPENED: return 'volcano';
            case SUPPORT_TICKET_STATUS.OPEN: return 'error';
            default: return 'default';
        }
    };

    return (
        <Tag 
            style={{ 
                borderRadius: 8, 
                margin: "unset", 
                display: "flex", 
                alignItems: "center", 
                fontSize: 12, 
                lineHeight: 1.5,
                padding: '2px 8px',
                height: 24,
                width: "fit-content" 
            }} 
            color={getStatusColor(ticket.status)}
        >
            {ticket.status}
        </Tag>
    )
}

export default SupportTicketStatus