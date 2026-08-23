'use client'

import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';

import { BillingHistoryItem } from '@type/razorpay';
import { getBoundedPaymentStringContext, logPaymentFailure } from '@hook/paymentDiagnostics';
import { formatDateTime } from '@util/dateTime';
import { Button, Card, Empty, Flex, Space, Table, Tag, Tooltip, Typography, message, theme } from 'antd';
import { useFormatter } from 'next-intl';
import { LuExternalLink, LuGift, LuPackage, LuReceipt, LuZap } from 'react-icons/lu';

const { Text } = Typography;

interface BillingHistoryProps {
    billingHistory: BillingHistoryItem[];
    fetchBillingHistory: () => void;
    diagnosticContext?: Record<string, boolean | number | string | null | undefined>;
}

const BillingHistory = ({ billingHistory, fetchBillingHistory, diagnosticContext }: BillingHistoryProps) => {
    const { token } = theme.useToken();
    const formatter = useFormatter();
    // A simple currency formatter (replace with your existing useFormatCurrency hook if preferred)
    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100);
    };
    const handleOpenInvoice = (record: BillingHistoryItem) => {
        const documentUrl = record.billingDocumentUrl || record.invoiceUrl;
        if (!documentUrl) return;
        try {
            openIsolatedBrowserUrl(documentUrl);
        } catch (error) {
            logPaymentFailure('payment_desktop_billing_invoice_open_failed', error, {
                ...diagnosticContext,
                surface: 'desktop_billing_history',
                flow: 'invoice_open',
                ...getBoundedPaymentStringContext('invoiceUrl', documentUrl),
                ...getBoundedPaymentStringContext('invoiceId', record.invoiceId),
                ...getBoundedPaymentStringContext('billingHistoryItemId', record.id),
                ...getBoundedPaymentStringContext('billingHistoryItemType', record.type),
                ...getBoundedPaymentStringContext('invoiceStatus', record.status),
            });
            message.error('Could not open invoice.');
        }
    };

    const columns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (timestamp: number) => (
                <Tooltip title={formatDateTime(timestamp, 'datetime', formatter)}>
                    {formatDateTime(timestamp, 'date', formatter)}
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
                            <LuZap color={token.colorInfo} />
                        ) : record.type === 'Referral reward' ? (
                            <LuGift color={token.colorSuccess} />
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
            render: (amount: number, record: BillingHistoryItem) => (
                <Text>{record.type === 'Referral reward' ? 'No charge' : formatCurrency(amount, record.currency)}</Text>
            ),
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
                const isCredited = status === 'credited';
                const isSuccess = status === 'captured' || status === 'paid' || isCredited;
                return <Tag style={{ maxWidth: "max-content" }} color={isSuccess ? 'success' : 'warning'}>{isCredited ? 'Credited' : isSuccess ? 'Paid' : status.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Invoice',
            key: 'invoice',
            render: (_: any, record: BillingHistoryItem) => {
                if (!record.billingDocumentUrl && !record.invoiceUrl) return <Text type="secondary">N/A</Text>;
                return (
                    <Tooltip title={record.billingDocumentUrl ? `Download ${record.billingDocumentNumber || 'billing document'}` : 'View provider receipt'}>
                        <Button
                            type="text"
                            shape="circle"
                            icon={<LuExternalLink />}
                            onClick={() => handleOpenInvoice(record)}
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
