'use client';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { getAllFeedback } from '@database/feedback';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { Feedback } from '@type/feedback';
import { Card, Col, Descriptions, Empty, Flex, Layout, List, message, Modal, Rate, Row, Statistic, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuMessageSquare, LuStar, LuUsers } from 'react-icons/lu';

const { Title, Text } = Typography;
const { Content } = Layout;

const TYPE_COLORS: Record<string, string> = { general: 'blue', feature_usage: 'orange', feature_request: 'purple' };
const TYPE_LABELS: Record<string, string> = { general: 'General', feature_usage: 'Feature Usage', feature_request: 'Feature Request' };

function FeedbackAdminTemplate() {
    const dispatch = useAppDispatch();
    const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
    const [selected, setSelected] = useState<Feedback | null>(null);

    useEffect(() => {
        const fetch = async () => {
            dispatch(startLoader('Loading feedback...'));
            try {
                const result = await getAllFeedback(200);
                setFeedbackList(result || []);
            } catch { message.error('Failed to load feedback'); }
            finally { dispatch(stopLoader('Loading feedback...')); }
        };
        fetch();
    }, [dispatch]);

    const stats = useMemo(() => {
        const total = feedbackList.length;
        const rated = feedbackList.filter(f => f.rating);
        const avgRating = rated.length > 0 ? rated.reduce((s, f) => s + (f.rating || 0), 0) / rated.length : 0;
        const uniqueUsers = new Set(feedbackList.map(f => f.uId)).size;
        return { total, avgRating, uniqueUsers };
    }, [feedbackList]);

    return (
        <Layout style={{ height: '100%', padding: 24 }}>
            <Content>
                <Title level={3}>Feedback Analytics</Title>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={8}><Card><Statistic title="Total Feedback" value={stats.total} prefix={<LuMessageSquare />} /></Card></Col>
                    <Col xs={8}><Card><Statistic title="Avg Rating" value={stats.avgRating} precision={1} suffix="/ 5" prefix={<LuStar />} /></Card></Col>
                    <Col xs={8}><Card><Statistic title="Unique Users" value={stats.uniqueUsers} prefix={<LuUsers />} /></Card></Col>
                </Row>
                <Card title={`All Feedback (${feedbackList.length})`}>
                    <List
                        dataSource={feedbackList}
                        locale={{ emptyText: <Empty description="No feedback submitted yet" /> }}
                        renderItem={(item) => (
                            <List.Item onClick={() => setSelected(item)} style={{ cursor: 'pointer' }}>
                                <List.Item.Meta
                                    title={<Flex gap={8} align="center">
                                        <Tag color={TYPE_COLORS[item.type]}>{TYPE_LABELS[item.type] || item.type}</Tag>
                                        {item.rating && <Rate disabled value={item.rating} style={{ fontSize: 14 }} />}
                                    </Flex>}
                                    description={<Flex vertical gap={2}>
                                        {item.comment && <Text ellipsis style={{ maxWidth: 500 }}>{item.comment}</Text>}
                                        {item.featureRequest && <Text type="secondary" ellipsis style={{ maxWidth: 500 }}>Request: {item.featureRequest}</Text>}
                                        <Text type="secondary" style={{ fontSize: 11 }}><DateTimeDisplay value={item.createdOn} mode="datetime" /></Text>
                                    </Flex>}
                                />
                            </List.Item>
                        )}
                    />
                </Card>
                <Modal open={!!selected} onCancel={() => setSelected(null)} footer={null} width={600} title="Feedback Detail">
                    {selected && (
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Type"><Tag color={TYPE_COLORS[selected.type]}>{TYPE_LABELS[selected.type]}</Tag></Descriptions.Item>
                            {selected.rating && <Descriptions.Item label="Rating"><Rate disabled value={selected.rating} /></Descriptions.Item>}
                            {selected.comment && <Descriptions.Item label="Comment">{selected.comment}</Descriptions.Item>}
                            {selected.featureComment && <Descriptions.Item label="Feature Comment">{selected.featureComment}</Descriptions.Item>}
                            {selected.featureIssues?.length > 0 && <Descriptions.Item label="Feature Issues">{selected.featureIssues.join(', ')}</Descriptions.Item>}
                            {selected.featureRequest && <Descriptions.Item label="Feature Request">{selected.featureRequest}</Descriptions.Item>}
                            {selected.votedPopularRequests?.length > 0 && <Descriptions.Item label="Voted On">{selected.votedPopularRequests.map(v => `${v.feature} (${v.interested ? '👍' : '👎'})`).join(', ')}</Descriptions.Item>}
                            <Descriptions.Item label="Submitted"><DateTimeDisplay value={selected.createdOn} mode="datetime" /></Descriptions.Item>
                        </Descriptions>
                    )}
                </Modal>
            </Content>
        </Layout>
    );
}

export default FeedbackAdminTemplate;
