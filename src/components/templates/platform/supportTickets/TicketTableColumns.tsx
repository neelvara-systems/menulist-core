import DateTimeDisplay from '@atoms/DateTimeDisplay';
import {
    getSupportTicketTimestampMillis,
    SUPPORT_TICKET_PRIORITY,
    SUPPORT_TICKET_STATUS,
    SupportTicketType,
} from '@type/supportTicket';
import { Avatar, Badge, Button, Dropdown, MenuProps, Modal, Space, Tag, Tooltip, Typography } from 'antd';
import { GlobalToken } from 'antd/es/theme/interface';
import { ColumnsType } from 'antd/es/table';
import { LuEye, LuMoreHorizontal, LuPen, LuRotateCcw, LuTrash2 } from 'react-icons/lu';

const { Text } = Typography;

interface GetTicketColumnsProps {
    token: GlobalToken;
    onView: (ticket: SupportTicketType) => void;
    onEdit: (ticket: SupportTicketType) => void;
    onDelete?: (ticket: SupportTicketType) => void;
    onRestore?: (ticket: SupportTicketType) => void;
    isTrashView?: boolean;
}

export const getTicketTableColumns = ({ token, onView, onEdit, onDelete, onRestore, isTrashView = false }: GetTicketColumnsProps): ColumnsType<SupportTicketType> => {

    const handleDelete = (record: SupportTicketType) => {
        Modal.confirm({
            title: 'Delete Support Ticket',
            content: (
                <div>
                    <p>Are you sure you want to delete this ticket?</p>
                    <p><strong>Ticket ID:</strong> {record.displayId}</p>
                    <p><strong>Subject:</strong> {record.subject}</p>
                    <p style={{ marginTop: 12, color: '#ff4d4f' }}>
                        <strong>Note:</strong> This will soft-delete the ticket. It can be restored later if needed.
                    </p>
                </div>
            ),
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => onDelete?.(record),
        });
    };

    const handleRestore = (record: SupportTicketType) => {
        Modal.confirm({
            title: 'Restore Support Ticket',
            content: (
                <div>
                    <p>Restore this ticket to active queue?</p>
                    <p><strong>Ticket ID:</strong> {record.displayId}</p>
                    <p><strong>Subject:</strong> {record.subject}</p>
                </div>
            ),
            okText: 'Restore',
            okType: 'primary',
            cancelText: 'Cancel',
            onOk: () => onRestore?.(record),
        });
    };

    const getActionMenu = (record: SupportTicketType): MenuProps => ({
        items: isTrashView ? [
            // Trash view actions
            {
                key: 'view',
                label: 'View Details',
                icon: <LuEye size={14} />,
                onClick: (e) => {
                    e.domEvent.stopPropagation();
                    onView(record);
                },
            },
            { type: 'divider' as const },
            {
                key: 'restore',
                label: 'Restore Ticket',
                icon: <LuRotateCcw size={14} />,
                onClick: (e) => {
                    e.domEvent.stopPropagation();
                    handleRestore(record);
                },
            },
        ] : [
            // Active tickets actions
            {
                key: 'view',
                label: 'View as Client',
                icon: <LuEye size={14} />,
                onClick: (e) => {
                    e.domEvent.stopPropagation();
                    onView(record);
                },
            },
            {
                key: 'edit',
                label: 'Edit Ticket',
                icon: <LuPen size={14} />,
                onClick: (e) => {
                    e.domEvent.stopPropagation();
                    onEdit(record);
                },
            },
            { type: 'divider' as const },
            {
                key: 'delete',
                label: 'Delete',
                icon: <LuTrash2 size={14} />,
                danger: true,
                onClick: (e) => {
                    e.domEvent.stopPropagation();
                    handleDelete(record);
                },
            },
        ],
    });

    return [
        {
            title: 'Ticket ID',
            dataIndex: 'displayId',
            key: 'displayId',
            width: 120,
            render: (id) => (
                <Text strong style={{ fontFamily: 'monospace', fontSize: 13 }}>
                    {id}
                </Text>
            ),
            sorter: (a, b) => a.displayId.localeCompare(b.displayId),
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            ellipsis: true,
            render: (subject) => (
                <Text style={{ fontSize: 13 }}>{subject}</Text>
            ),
            sorter: (a, b) => a.subject.localeCompare(b.subject),
        },
        {
            title: 'Requester',
            dataIndex: 'clientDetails',
            key: 'requester',
            width: 220,
            render: (clientDetails: SupportTicketType['clientDetails']) => (
                <Space direction="vertical" size={0} style={{ maxWidth: 210 }}>
                    <Text strong ellipsis style={{ fontSize: 13 }}>
                        {clientDetails?.storeName || clientDetails?.tenantName || 'Unknown customer'}
                    </Text>
                    <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                        {clientDetails?.email || clientDetails?.phone || 'No contact saved'}
                    </Text>
                </Space>
            ),
            sorter: (a, b) => (
                (a.clientDetails?.storeName || a.clientDetails?.tenantName || '')
                    .localeCompare(b.clientDetails?.storeName || b.clientDetails?.tenantName || '')
            ),
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            width: 150,
            render: (category) => (
                <Tag
                    style={{
                        borderRadius: 16,
                        border: 'none',
                        background: token.colorBgContainer,
                        color: token.colorTextSecondary,
                        fontSize: 12,
                        padding: '2px 12px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {category}
                </Tag>
            ),
            sorter: (a, b) => a.category.localeCompare(b.category),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: SupportTicketType['status']) => {
                const config: Partial<Record<SupportTicketType['status'], { text: string }>> = {
                    [SUPPORT_TICKET_STATUS.OPEN]: { text: 'Open' },
                    [SUPPORT_TICKET_STATUS.IN_PROGRESS]: { text: 'In Progress' },
                    [SUPPORT_TICKET_STATUS.RESOLVED]: { text: 'Resolved' },
                    [SUPPORT_TICKET_STATUS.CLOSED]: { text: 'Closed' },
                };
                const { text } = config[status] || { text: status };
                return (
                    <Badge status={status === SUPPORT_TICKET_STATUS.RESOLVED ? 'success' : status === SUPPORT_TICKET_STATUS.CLOSED ? 'default' : 'processing'} text={text} />
                );
            },
            sorter: (a, b) => a.status.localeCompare(b.status),
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 100,
            render: (priority: SupportTicketType['priority']) => {
                const config: Record<SupportTicketType['priority'], { color: string; dot: string }> = {
                    [SUPPORT_TICKET_PRIORITY.HIGH]: { color: token.colorError, dot: '⬤' },
                    [SUPPORT_TICKET_PRIORITY.NORMAL]: { color: token.colorWarning, dot: '⬤' },
                    [SUPPORT_TICKET_PRIORITY.LOW]: { color: token.colorSuccess, dot: '⬤' },
                };
                const { color, dot } = config[priority] || { color: token.colorTextDisabled, dot: '⬤' };
                return (
                    <Space size={6}>
                        <span style={{ color, fontSize: 10 }}>{dot}</span>
                        <Text style={{ fontSize: 13 }}>{priority}</Text>
                    </Space>
                );
            },
            sorter: (a, b) => a.priority.localeCompare(b.priority),
        },
        {
            title: 'Created',
            dataIndex: 'createdOn',
            key: 'createdOn',
            width: 160,
            render: (createdOn) => (
                <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    <DateTimeDisplay value={createdOn} mode='datetime' />
                </Text>
            ),
            sorter: (a, b) => (
                (getSupportTicketTimestampMillis(b.createdOn) ?? 0)
                - (getSupportTicketTimestampMillis(a.createdOn) ?? 0)
            ),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Updated',
            dataIndex: 'modifiedOn',
            key: 'modifiedOn',
            width: 160,
            render: (modifiedOn) => (
                <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    <DateTimeDisplay value={modifiedOn} mode='datetime' />
                </Text>
            ),
            sorter: (a, b) => (
                (getSupportTicketTimestampMillis(b.modifiedOn) ?? 0)
                - (getSupportTicketTimestampMillis(a.modifiedOn) ?? 0)
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            fixed: 'right' as const,
            render: (_, record) => (
                <Dropdown menu={getActionMenu(record)} trigger={['click']} placement="bottomRight">
                    <Button
                        type="text"
                        icon={<LuMoreHorizontal size={18} />}
                        style={{ padding: '4px 8px' }}
                        onClick={(e) => e.stopPropagation()} // Prevent row click when clicking action menu
                    />
                </Dropdown>
            ),
        },
    ];
};
