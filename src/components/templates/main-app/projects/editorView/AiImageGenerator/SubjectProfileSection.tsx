import { Card, Collapse, Flex, Typography, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { LuUser } from 'react-icons/lu';
import { isSavedPersonRecommendedForBusiness } from './imageViewType';
import SubjectProfileSelector from './SubjectProfileSelector';

interface SubjectProfileSectionProps {
    businessType?: string | null;
    canManage: boolean;
    onChange: (profileId: string | null, version: number | null) => void;
    subjectProfileId?: string | null;
    subjectProfileVersion?: number | null;
}

export default function SubjectProfileSection({
    businessType,
    canManage,
    onChange,
    subjectProfileId,
    subjectProfileVersion,
}: SubjectProfileSectionProps) {
    const { token } = theme.useToken();
    const recommended = isSavedPersonRecommendedForBusiness(businessType);
    const [optionalSectionOpen, setOptionalSectionOpen] = useState(Boolean(subjectProfileId));

    useEffect(() => {
        if (subjectProfileId) setOptionalSectionOpen(true);
    }, [subjectProfileId]);

    const selector = (
        <SubjectProfileSelector
            canManage={canManage}
            subjectProfileId={subjectProfileId}
            subjectProfileVersion={subjectProfileVersion}
            onChange={onChange}
        />
    );

    if (recommended) {
        return (
            <Card
                size="small"
                style={{
                    background: token.colorPrimaryBg,
                    borderColor: token.colorPrimaryBorder,
                    width: '100%',
                }}
            >
                <Flex gap={10} vertical>
                    <Flex gap={8} align="center">
                        <LuUser aria-hidden />
                        <Typography.Text strong>Keep the same person across photos</Typography.Text>
                    </Flex>
                    <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.45 }}>
                        Recommended for this business. Choose an authorized adult once, then reuse them across relevant services and scenes.
                    </Typography.Text>
                    {selector}
                </Flex>
            </Card>
        );
    }

    return (
        <Collapse
            activeKey={optionalSectionOpen ? ['saved-person'] : []}
            destroyOnHidden
            onChange={(keys) => setOptionalSectionOpen(Array.isArray(keys) && keys.includes('saved-person'))}
            items={[{
                children: optionalSectionOpen ? selector : null,
                key: 'saved-person',
                label: (
                    <Flex gap={8} align="center">
                        <LuUser aria-hidden />
                        <Flex gap={2} vertical>
                            <Typography.Text strong>Include a saved person</Typography.Text>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                Optional for this item
                            </Typography.Text>
                        </Flex>
                    </Flex>
                ),
            }]}
            style={{ width: '100%' }}
        />
    );
}
