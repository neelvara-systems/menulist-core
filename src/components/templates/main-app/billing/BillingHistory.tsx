'use client'

import { BillingHistoryItem } from '@type/razorpay';
import { Button, Card, Empty, Flex, Space, Table, Tag, Tooltip, Typography, theme } from 'antd';
import { useFormatter } from 'next-intl';
import { FaBolt } from 'react-icons/fa';
import { LuExternalLink, LuPackage, LuReceipt } from 'react-icons/lu';

const { Text } = Typography;

interface BillingHistoryProps {
    billingHistory: BillingHistoryItem[];
    fetchBillingHistory: () => void;
}

const BillingHistory = ({ billingHistory, fetchBillingHistory }: BillingHistoryProps) => {
    const { token } = theme.useToken();
    const formatter = useFormatter();
    // A simple currency formatter (replace with your existing useFormatCurrency hook if preferred)
    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100);
    };

    const columns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (timestamp: number) => (
                <Tooltip title={formatter.dateTime(new Date(timestamp), { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}>
                    {formatter.dateTime(new Date(timestamp), { year: 'numeric', month: 'short', day: 'numeric' })}
                </Tooltip>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => <Text>{type}</Text>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (text: string, record: BillingHistoryItem) => (
                <Space>
                        {record.type === 'Subscription Payment' ? (
                            <FaBolt color={token.colorInfo} />
                        ) : (
                            <LuPackage color={token.colorWarning} />
                        )}
                        <Text strong>{text}</Text>
                    </Space>
                )
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount: number, record: BillingHistoryItem) => <Text>{formatCurrency(amount, record.currency)}</Text>,
        },
        {
            title: 'Billing Cycle',
            dataIndex: 'billingCycle',
            key: 'billingCycle',
            render: (billingCycle: string) => <Text>{billingCycle || 'N/A'}</Text>,
        },
        {
            title: 'Credits',
            dataIndex: 'credits',
            key: 'credits',
            render: (credits: number) => <Text>{credits || 'N/A'}</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                // Since our query only fetches successful payments, the status will almost always be 'captured' or 'paid'.
                const isSuccess = status === 'captured' || status === 'paid';
                return <Tag style={{ maxWidth: "max-content" }} color={isSuccess ? 'success' : 'warning'}>{isSuccess ? 'Paid' : status.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Invoice',
            key: 'invoice',
            render: (_: any, record: BillingHistoryItem) => {
                if (!record.invoiceUrl) return <Text type="secondary">N/A</Text>;
                return (
                    <Tooltip title="View Invoice on Razorpay">
                        <Button
                            type="text"
                            shape="circle"
                            icon={<LuExternalLink />}
                            onClick={() => window.open(record.invoiceUrl, '_blank')}
                        />
                    </Tooltip>
                );
            },
        }
    ];

    if (billingHistory.length === 0) {
        return (
            <Card style={{ marginTop: '24px', textAlign: 'center' }} title="Billing History">
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <Text type="secondary">Your past invoices and payments will appear here.</Text>
                    }
                >
                    <Flex justify="center" style={{ marginTop: '24px', width: '100%' }}>
                        <Button onClick={fetchBillingHistory} icon={<LuReceipt />}>View Billing History</Button>
                    </Flex>
                </Empty>
            </Card>
        );
    }
    return (
        <Card
            title={(
                <Space>
                    <LuReceipt />
                    <Text>Billing History</Text>
                </Space>
            )}
            style={{ marginTop: '24px' }}
        >
            <Table
                dataSource={billingHistory}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                locale={{ emptyText: <Empty description="No billing history found." /> }}
            />
        </Card>
    );
};

export default BillingHistory;
