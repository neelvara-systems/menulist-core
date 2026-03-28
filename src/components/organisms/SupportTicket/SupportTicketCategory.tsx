import { SUPPORT_TICKET_CATEGORY, SupportTicketType } from '@type/supportTicket';
import { Tag } from 'antd';
import { LuBook, LuCreditCard, LuWrench } from 'react-icons/lu';

function SupportTicketCategory({ ticket }: { ticket: SupportTicketType }) {

    const getCategoryDetails = (category: string) => {
        switch (category) {
            case SUPPORT_TICKET_CATEGORY.TECHNICAL_ISSUE:
                return { icon: <LuWrench />, color: 'blue' };
            case SUPPORT_TICKET_CATEGORY.BILLING_INQUIRY:
                return { icon: <LuCreditCard />, color: 'green' };
            case SUPPORT_TICKET_CATEGORY.GENERAL_QUESTION:
            default:
                return { icon: <LuBook />, color: 'purple' };
        }
    };

    const categoryDetails = getCategoryDetails(ticket.category);

    return (
        <Tag 
            icon={categoryDetails.icon} 
            color={categoryDetails.color} 
            style={{ 
                borderRadius: 8, 
                margin: "unset", 
                display: 'flex', 
                alignItems: 'center', 
                gap: 4, 
                fontSize: 12,
                lineHeight: 1.5,
                padding: '2px 8px',
                height: 24,
                width: "fit-content" 
            }}
        >
            {ticket.category}
        </Tag>
    )
}

export default SupportTicketCategory