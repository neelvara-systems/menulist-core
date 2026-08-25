import { Card, Flex, theme } from 'antd';
import { useTranslations } from 'next-intl';

import { HELP_CENTER_TABS } from './tabsConfig';

interface MainSectionTabsProps {
    activeKey: string;
    onSelect: (key: string) => void;
}

function MainSectionTabs({ activeKey, onSelect }: MainSectionTabsProps) {
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();

    return (
        <Flex gap="large" justify="center" wrap style={{ width: '100%', marginBottom: 24 }}>
            {HELP_CENTER_TABS.map(item => (
                <Card
                    key={item.key}
                    hoverable
                    aria-pressed={activeKey === item.key}
                    onClick={() => onSelect(item.key)}
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;

                        event.preventDefault();
                        onSelect(item.key);
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                        flex: '1 1 150px',
                        maxWidth: 180,
                        minWidth: 140,
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
