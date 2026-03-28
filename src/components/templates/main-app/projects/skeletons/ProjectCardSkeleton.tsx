import { Card, Flex, Skeleton, Space } from 'antd';

interface ProjectCardSkeletonProps {
    count?: number;
}

export const ProjectCardSkeleton: React.FC<ProjectCardSkeletonProps> = ({ count = 3 }) => {
    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            {Array.from({ length: count }).map((_, index) => (
                <Card
                    key={index}
                    style={{
                        width: '100%',
                        borderRadius: 8
                    }}
                    className="animate__animated animate__fadeIn"
                >
                    <Flex vertical gap={12}>
                        {/* Project name */}
                        <Skeleton.Input
                            active
                            size="default"
                            style={{ width: 200, height: 24 }}
                        />

                        {/* Description */}
                        <Skeleton
                            active
                            paragraph={{ rows: 2, width: ['100%', '80%'] }}
                            title={false}
                        />

                        {/* Stats/Metadata */}
                        <Flex gap={16} style={{ marginTop: 8 }}>
                            <Skeleton.Button
                                active
                                size="small"
                                style={{ width: 80 }}
                            />
                            <Skeleton.Button
                                active
                                size="small"
                                style={{ width: 80 }}
                            />
                            <Skeleton.Button
                                active
                                size="small"
                                style={{ width: 100 }}
                            />
                        </Flex>
                    </Flex>
                </Card>
            ))}
        </Space>
    );
};
