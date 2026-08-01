import { SUPPORT_TICKET_PRIORITY, SupportTicketType } from '@type/supportTicket';
import { Tag } from 'antd';
import { LuFlame, LuShieldAlert, LuThermometerSun } from 'react-icons/lu';

function SupportTicketPriority({ ticket, style }: { ticket: Partial<SupportTicketType>, style?: React.CSSProperties }) {

    const getPriorityDetails = (priority?: string) => {
        switch (priority) {
            case SUPPORT_TICKET_PRIORITY.LOW:
                return { icon: <LuThermometerSun />, color: 'blue' };
            case SUPPORT_TICKET_PRIORITY.NORMAL:
                return { icon: <LuFlame />, color: 'orange' };
            case SUPPORT_TICKET_PRIORITY.HIGH:
                return { icon: <LuShieldAlert />, color: 'red' };
            default:
                return { icon: null, color: 'default' };
        }
    };

    const priorityDetails = getPriorityDetails(ticket.priority);

    return (
        <Tag
            icon={priorityDetails.icon}
            color={priorityDetails.color}
            style={{ 
                borderRadius: 8, 
                border: "unset", 
                margin: "unset", 
                display: "flex", 
                alignItems: "center", 
                gap: 4, 
                fontSize: 12,
                lineHeight: 1.5,
                padding: '2px 8px',
                height: 24,
                width: "fit-content", 
                ...style 
            }}
        >
            {ticket.priority}
        </Tag>
    )
}

export default SupportTicketPriority
