import { calculateSLAStatus, SUPPORT_TICKET_STATUS, SupportTicketType } from '@type/supportTicket';
import { CSVColumn, formatTimestampForCSV } from '@util/exportUtils';

/**
 * Support Ticket CSV Export Columns Configuration
 * Reusable column definitions for ticket exports
 */
export const ticketCSVColumns: CSVColumn<SupportTicketType>[] = [
    {
        header: 'Ticket ID',
        accessor: (ticket) => ticket.displayId,
    },
    {
        header: 'Client Store',
        accessor: (ticket) => ticket.clientDetails?.storeName || 'N/A',
    },
    {
        header: 'Client Tenant',
        accessor: (ticket) => ticket.clientDetails?.tenantName || 'N/A',
    },
    {
        header: 'Client Email',
        accessor: (ticket) => ticket.clientDetails?.email || 'N/A',
    },
    {
        header: 'Client Phone',
        accessor: (ticket) => ticket.clientDetails?.phone || 'N/A',
    },
    {
        header: 'Status',
        accessor: (ticket) => ticket.status,
    },
    {
        header: 'Priority',
        accessor: (ticket) => ticket.priority,
    },
    {
        header: 'Category',
        accessor: (ticket) => ticket.category,
    },
    {
        header: 'Subject',
        accessor: (ticket) => ticket.subject,
    },
    {
        header: 'Message',
        accessor: (ticket) => ticket.message || '',
    },
    {
        header: 'SLA Status',
        accessor: (ticket) => {
            if (!ticket.createdOn) return 'N/A';
            
            const hasResponse = ticket.messages && ticket.messages.length > 1;
            const isResolved = ticket.status === SUPPORT_TICKET_STATUS.RESOLVED || 
                              ticket.status === SUPPORT_TICKET_STATUS.CLOSED;
            
            if (isResolved) return 'Resolved';
            
            const sla = calculateSLAStatus(ticket.createdOn, ticket.priority, hasResponse, isResolved);
            return sla.resolutionStatus.replace('_', ' ');
        },
    },
    {
        header: 'SLA Time Remaining (hours)',
        accessor: (ticket) => {
            if (!ticket.createdOn) return 'N/A';
            
            const hasResponse = ticket.messages && ticket.messages.length > 1;
            const isResolved = ticket.status === SUPPORT_TICKET_STATUS.RESOLVED || 
                              ticket.status === SUPPORT_TICKET_STATUS.CLOSED;
            
            if (isResolved) return 'Resolved';
            
            const sla = calculateSLAStatus(ticket.createdOn, ticket.priority, hasResponse, isResolved);
            return Math.round(sla.resolutionTimeRemaining);
        },
    },
    {
        header: 'Tags',
        accessor: (ticket) => ticket.platformTags?.join('; ') || 'None',
    },
    {
        header: 'Messages Count',
        accessor: (ticket) => ticket.messages?.length || 0,
    },
    {
        header: 'Created On',
        accessor: (ticket) => formatTimestampForCSV(ticket.createdOn),
    },
    {
        header: 'Last Updated',
        accessor: (ticket) => formatTimestampForCSV(ticket.modifiedOn),
    },
];

/**
 * Minimal ticket export columns (for quick exports)
 */
export const ticketCSVColumnsMinimal: CSVColumn<SupportTicketType>[] = [
    {
        header: 'Ticket ID',
        accessor: (ticket) => ticket.displayId,
    },
    {
        header: 'Client',
        accessor: (ticket) => `${ticket.clientDetails?.storeName || 'N/A'} (${ticket.clientDetails?.tenantName || 'N/A'})`,
    },
    {
        header: 'Client Email',
        accessor: (ticket) => ticket.clientDetails?.email || 'N/A',
    },
    {
        header: 'Status',
        accessor: (ticket) => ticket.status,
    },
    {
        header: 'Priority',
        accessor: (ticket) => ticket.priority,
    },
    {
        header: 'Subject',
        accessor: (ticket) => ticket.subject,
    },
    {
        header: 'SLA Status',
        accessor: (ticket) => {
            if (!ticket.createdOn) return 'N/A';
            
            const hasResponse = ticket.messages && ticket.messages.length > 1;
            const isResolved = ticket.status === SUPPORT_TICKET_STATUS.RESOLVED || 
                              ticket.status === SUPPORT_TICKET_STATUS.CLOSED;
            
            if (isResolved) return 'Resolved';
            
            const sla = calculateSLAStatus(ticket.createdOn, ticket.priority, hasResponse, isResolved);
            return sla.resolutionStatus.replace('_', ' ');
        },
    },
    {
        header: 'Created On',
        accessor: (ticket) => formatTimestampForCSV(ticket.createdOn),
    },
];

/**
 * Analytics export columns (for analytics data)
 */
export const ticketAnalyticsColumns: CSVColumn<SupportTicketType>[] = [
    {
        header: 'Ticket ID',
        accessor: (ticket) => ticket.displayId,
    },
    {
        header: 'Priority',
        accessor: (ticket) => ticket.priority,
    },
    {
        header: 'Category',
        accessor: (ticket) => ticket.category,
    },
    {
        header: 'Created On',
        accessor: (ticket) => formatTimestampForCSV(ticket.createdOn),
    },
    {
        header: 'First Response Time (hours)',
        accessor: (ticket) => {
            if (!ticket.messages || ticket.messages.length <= 1 || !ticket.createdOn) return 'N/A';
            
            const firstAdminMessage = ticket.messages.find(msg => msg.sender.id !== ticket.uId);
            if (!firstAdminMessage) return 'N/A';
            
            const responseTime = firstAdminMessage.timestamp.toMillis() - ticket.createdOn.toMillis();
            return Math.round(responseTime / (1000 * 60 * 60) * 100) / 100; // Hours with 2 decimals
        },
    },
    {
        header: 'Resolution Time (hours)',
        accessor: (ticket) => {
            if (!ticket.createdOn) return 'N/A';
            
            const isResolved = ticket.status === SUPPORT_TICKET_STATUS.RESOLVED || 
                              ticket.status === SUPPORT_TICKET_STATUS.CLOSED;
            
            if (!isResolved) return 'Not Resolved';
            
            const resolvedStatus = ticket.statuses?.find(
                s => s.status === SUPPORT_TICKET_STATUS.RESOLVED || 
                     s.status === SUPPORT_TICKET_STATUS.CLOSED
            );
            
            if (!resolvedStatus) return 'N/A';
            
            const resolutionTime = resolvedStatus.timestamp.seconds * 1000 - ticket.createdOn.toMillis();
            return Math.round(resolutionTime / (1000 * 60 * 60) * 100) / 100; // Hours with 2 decimals
        },
    },
    {
        header: 'SLA Status',
        accessor: (ticket) => {
            if (!ticket.createdOn) return 'N/A';
            
            const hasResponse = ticket.messages && ticket.messages.length > 1;
            const isResolved = ticket.status === SUPPORT_TICKET_STATUS.RESOLVED || 
                              ticket.status === SUPPORT_TICKET_STATUS.CLOSED;
            
            if (isResolved) return 'Resolved';
            
            const sla = calculateSLAStatus(ticket.createdOn, ticket.priority, hasResponse, isResolved);
            return sla.resolutionStatus.replace('_', ' ');
        },
    },
    {
        header: 'SLA Breached',
        accessor: (ticket) => {
            if (!ticket.createdOn) return 'N/A';
            
            const hasResponse = ticket.messages && ticket.messages.length > 1;
            const isResolved = ticket.status === SUPPORT_TICKET_STATUS.RESOLVED || 
                              ticket.status === SUPPORT_TICKET_STATUS.CLOSED;
            
            if (isResolved) return 'No';
            
            const sla = calculateSLAStatus(ticket.createdOn, ticket.priority, hasResponse, isResolved);
            return sla.resolutionStatus === 'breached' ? 'Yes' : 'No';
        },
    },
];
