import { Card, Flex, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction } from 'react';

import { HELP_CENTER_TABS } from './tabsConfig';

interface MainSectionTabsProps {
    activeKey: string;
    onSelect: Dispatch<SetStateAction<string>>;
}

function MainSectionTabs({ activeKey, onSelect }: MainSectionTabsProps) {
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();

    return (
        <Flex gap="large" justify="center" style={{ width: '100%', marginBottom: 24 }}>
            {HELP_CENTER_TABS.map(item => (
                <Card
                    key={item.key}
                    hoverable
                    onClick={() => onSelect(item.key)}
                    style={{
                        width: 160,
                        borderRadius: 26,
                        textAlign: 'center',
                        backgroundImage: activeKey === item.key ? `linear-gradient(to bottom, ${token.colorPrimaryBorder}, ${token.colorPrimaryBg})` : 'none',
                    }}
                    styles={{ body: { padding: 16 } }}
                >
                    <Flex vertical align="center" justify='center' gap={8}>
                        <Flex style={{
                            minWidth: 40,
                            height: 40,
                            borderRadius: 26,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: activeKey === item.key ? token.colorPrimaryBg : token.colorFillContent,
                            color: activeKey === item.key ? token.colorPrimaryTextActive : token.colorTextDescription
                        }}>
                            {item.icon}
                        </Flex>
                        {t(item.titleKey as any)}
                    </Flex>
                </Card>
            ))}
        </Flex>
    )
}

export default MainSectionTabs