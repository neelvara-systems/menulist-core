'use client'

import { LuInfo } from 'react-icons/lu';
import { Button, Flex, NavBar, Popover, Text } from '../antd';

interface MobileSettingsScreenHeaderProps {
    description: string;
    onBack: () => void;
    right?: React.ReactNode;
    title: string;
}

export default function MobileSettingsScreenHeader({
    description,
    onBack,
    right,
    title,
}: MobileSettingsScreenHeaderProps) {
    return (
        <NavBar
            onBack={onBack}
            right={(
                <Flex align="center" gap={4}>
                    {right}
                    <Popover
                        content={(
                            <Flex gap={4} style={{ maxWidth: 240 }} vertical>
                                <Text strong>{title}</Text>
                                <Text type="secondary">{description}</Text>
                            </Flex>
                        )}
                        placement="bottomRight"
                        trigger="click"
                    >
                        <Button
                            aria-label={`About ${title}`}
                            fill="none"
                            style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}
                        >
                            <LuInfo size={18} />
                        </Button>
                    </Popover>
                </Flex>
            )}
        >
            {title}
        </NavBar>
    );
}
