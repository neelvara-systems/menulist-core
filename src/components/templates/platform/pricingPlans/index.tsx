'use client'

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { PricingPlan } from '@data/common';
import { addPricingPlan, deactivatePricingPlan, getAllPricingPlans, PricingPlanMutationInput, updatePricingPlan } from '@database/pricingPlans';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { Button, Card, Col, Divider, Drawer, Form, Input, InputNumber, Modal, Radio, Row, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;
const { TextArea } = Input;

function PricingPlans() {
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
    const [form] = Form.useForm();

    // Load all pricing plans when component mounts
    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const data = await getAllPricingPlans();
            setPlans(data || []);
        } catch (error) {
            logRuntimeFailure('platform_pricing_plans_load_failed', error);
            message.error('Failed to load pricing plans');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePlan = () => {
        form.resetFields();
        form.setFieldsValue({
            active: true,
            periodicity: 'MONTH',
            planType: 'B2C', // Default to B2C plan type
            currency: 'INR', // Default to Indian Rupees
            features: [''],
        });
        setEditingPlan(null);
        setDrawerVisible(true);
    };

    const handleEditPlan = (plan: PricingPlan) => {
        form.resetFields();
        form.setFieldsValue({
            ...plan,
            // Convert price from paise to display value
            price: plan.price / 100,
        });
        setEditingPlan(plan);
        setDrawerVisible(true);
    };

    const handleSavePlan = async (values: PricingPlanMutationInput & { price: number }) => {
        try {
            // Convert price to paise for storage
            const planData: PricingPlanMutationInput = {
                ...values,
                price: Math.round(values.price * 100), // Convert to paise
                features: values.features.filter((f: string) => f.trim() !== ''),
            };

            if (editingPlan?.id) {
                // Update existing plan
                await updatePricingPlan({
                    ...planData,
                    id: editingPlan.id,
                });
                message.success('Plan updated successfully');
            } else {
                // Create new plan
                await addPricingPlan(planData);
                message.success('Plan created successfully');
            }

            setDrawerVisible(false);
            fetchPlans();
        } catch (error) {
            logRuntimeFailure('platform_pricing_plan_save_failed', error, {
                ...getBoundedRuntimeStringContext('planId', editingPlan?.id),
                ...getBoundedRuntimeStringContext('planName', values?.name),
                isEdit: Boolean(editingPlan?.id),
            });
            message.error('Failed to save plan');
        }
    };

    const handleDeactivatePlan = async (plan: PricingPlan) => {
        Modal.confirm({
            title: 'Deactivate Plan',
            content: `Are you sure you want to deactivate the "${plan.name}" plan? This will hide it from users but preserve all historical data.`,
            okText: 'Deactivate',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await deactivatePricingPlan(plan.id as string);
                    message.success('Plan deactivated successfully');
                    fetchPlans();
                } catch (error) {
                    logRuntimeFailure('platform_pricing_plan_deactivate_failed', error, {
                        ...getBoundedRuntimeStringContext('planId', plan.id),
                        ...getBoundedRuntimeStringContext('planName', plan.name),
                    });
                    message.error('Failed to deactivate plan');
                }
            },
        });
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a: PricingPlan, b: PricingPlan) => a.name.localeCompare(b.name),
            render: (text: string, record: PricingPlan) => (
                <Space>
                    {text}
                    {record.recommended && <Tag color="gold">Recommended</Tag>}
                </Space>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            sorter: (a: PricingPlan, b: PricingPlan) => a.description.localeCompare(b.description),
            render: (text: string) => (
                <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {text}
                </div>
            ),
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            sorter: (a: PricingPlan, b: PricingPlan) => a.price - b.price,
            render: (price: number, record: PricingPlan) => {
                const currencySymbol = record.currency === 'INR' ? '₹' : '$';
                return `${currencySymbol}${(price / 100).toFixed(2)}`;
            },
        },
        {
            title: 'Currency',
            dataIndex: 'currency',
            key: 'currency',
            sorter: (a: PricingPlan, b: PricingPlan) => a.currency.localeCompare(b.currency),
            filters: [
                { text: 'INR', value: 'INR' },
                { text: 'USD', value: 'USD' },
            ],
            onFilter: (value: string, record: PricingPlan) => record.currency === value,
            render: (currency: string) => (
                <Tag color={currency === 'INR' ? 'purple' : 'cyan'}>
                    {currency === 'INR' ? 'Indian Rupee' : 'US Dollar'}
                </Tag>
            ),
        },
        {
            title: 'Plan Type',
            dataIndex: 'planType',
            key: 'planType',
            sorter: (a: PricingPlan, b: PricingPlan) => a.planType.localeCompare(b.planType),
            filters: [
                { text: 'B2C', value: 'B2C' },
                { text: 'B2B', value: 'B2B' },
            ],
            onFilter: (value: string, record: PricingPlan) => record.planType === value,
            render: (planType: string) => (
                <Tag color={planType === 'B2C' ? 'green' : 'blue'}>
                    {planType}
                </Tag>
            ),
        },
        {
            title: 'Billing',
            dataIndex: 'periodicity',
            key: 'periodicity',
            sorter: (a: PricingPlan, b: PricingPlan) => a.periodicity.localeCompare(b.periodicity),
            filters: [
                { text: 'Monthly', value: 'MONTH' },
                { text: 'Yearly', value: 'YEAR' },
            ],
            onFilter: (value: string, record: PricingPlan) => record.periodicity === value,
            render: (periodicity: string) => periodicity.charAt(0) + periodicity.slice(1).toLowerCase(),
        },
        // {
        //     title: 'Features',
        //     dataIndex: 'features',
        //     key: 'features',
        //     render: (features: string[]) => `${features.length} features`,
        // },
        // {
        //     title: 'Status',
        //     dataIndex: 'active',
        //     key: 'active',
        //     render: (active: boolean) => (
        //         <Badge 
        //             status={active ? 'success' : 'default'} 
        //             text={active ? 'Active' : 'Inactive'} 
        //         />
        //     ),
        // },
        // {
        //     title: 'Version',
        //     dataIndex: 'version',
        //     key: 'version',
        // },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: PricingPlan) => (
                <Space>
                    <Button
                        icon={<EditOutlined />}
                        type="text"
                        onClick={() => handleEditPlan(record)}
                    />
                    {record.active && (
                        <Button
                            icon={<DeleteOutlined />}
                            type="text"
                            danger
                            onClick={() => handleDeactivatePlan(record)}
                        />
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '20px 0' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                <Col>
                    <Title level={4}>Pricing Plans Management</Title>
                    <Text type="secondary">
                        Create and manage subscription plans for your customers
                    </Text>
                </Col>
                <Col>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreatePlan}
                    >
                        Add New Plan
                    </Button>
                </Col>
            </Row>

            <Card>
                <Table
                    dataSource={plans}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    rowClassName={(record: PricingPlan) =>
                        record.currency === 'INR' ? 'inr-row' : 'usd-row'
                    }
                />

                {/* Add CSS for row styling */}
                <style jsx>{`
                    :global(.inr-row) {
                        background-color: rgba(139, 0, 139, 0.05);
                    }
                    :global(.inr-row:hover) {
                        background-color: rgba(139, 0, 139, 0.1) !important;
                    }
                    :global(.usd-row) {
                        background-color: rgba(0, 139, 139, 0.05);
                    }
                    :global(.usd-row:hover) {
                        background-color: rgba(0, 139, 139, 0.1) !important;
                    }
                `}</style>
            </Card>

            <Drawer
                title={editingPlan ? `Edit ${editingPlan.name}` : 'Create New Plan'}
                width={520}
                open={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                extra={
                    <Space>
                        <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
                        <Button type="primary" onClick={() => form.submit()}>
                            Save
                        </Button>
                    </Space>
                }
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSavePlan}
                >
                    <Form.Item
                        name="name"
                        label="Plan Name"
                        rules={[{ required: true, message: 'Please enter plan name' }]}
                    >
                        <Input placeholder="e.g. Basic Plan" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Plan Description"
                        rules={[{ required: true, message: 'Please enter plan description' }]}
                    >
                        <TextArea
                            placeholder="e.g. Perfect for small businesses getting started with menu digitization"
                            rows={3}
                        />
                    </Form.Item>

                    <Form.Item
                        name="price"
                        label="Price"
                        rules={[{ required: true, message: 'Please enter price' }]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            step={1}
                            precision={2}
                            placeholder="99.99"
                        />
                    </Form.Item>

                    <Form.Item
                        name="currency"
                        label="Currency"
                        rules={[{ required: true, message: 'Please select currency' }]}
                    >
                        <Radio.Group>
                            <Radio.Button value="INR">Indian Rupee (₹)</Radio.Button>
                            <Radio.Button value="USD">US Dollar ($)</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item
                        name="periodicity"
                        label="Billing Cycle"
                        rules={[{ required: true }]}
                    >
                        <Radio.Group>
                            <Radio.Button value="MONTH">Monthly</Radio.Button>
                            <Radio.Button value="YEAR">Yearly</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item
                        name="planType"
                        label="Plan Type"
                        rules={[{ required: true, message: 'Please select plan type' }]}
                    >
                        <Radio.Group>
                            <Radio.Button value="B2C">B2C</Radio.Button>
                            <Radio.Button value="B2B">B2B</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item
                        name="recommended"
                        label="Recommended Plan"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        name="razorpayPlanId"
                        label="Razorpay Plan ID"
                        rules={[{ required: true, message: 'Please enter Razorpay Plan ID' }]}
                        tooltip="Enter the Razorpay Plan ID that corresponds to the selected plan details (periodicity and currency)"
                    >
                        <Input placeholder="e.g. plan_AbCdEfGhIjKl" />
                    </Form.Item>

                    <Divider orientation="left">Features</Divider>
                    <Form.List name="features">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Form.Item
                                        key={key}
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Space>
                                            <Form.Item
                                                {...restField}
                                                name={name}
                                                noStyle
                                            >
                                                <Input placeholder="e.g. 10GB Storage" style={{ width: '400px' }} />
                                            </Form.Item>
                                            {fields.length > 1 && (
                                                <DeleteOutlined onClick={() => remove(name)} />
                                            )}
                                        </Space>
                                    </Form.Item>
                                ))}
                                <Form.Item>
                                    <Button
                                        type="dashed"
                                        onClick={() => add()}
                                        block
                                        icon={<PlusOutlined />}
                                    >
                                        Add Feature
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>

                    <Form.Item
                        name="active"
                        label="Status"
                        valuePropName="checked"
                    >
                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
    );
}

export default PricingPlans;
