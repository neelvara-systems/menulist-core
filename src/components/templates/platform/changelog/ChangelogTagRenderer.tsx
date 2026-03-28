import React from 'react';
import { Tag } from 'antd';
import { CHANGELOG_TAG_CONFIG } from '@constant/changelog';

interface ChangelogTagRendererProps {
    tag: string;
}

const ChangelogTagRenderer: React.FC<ChangelogTagRendererProps> = ({ tag }) => {
    const config = CHANGELOG_TAG_CONFIG[tag];

    if (!config) {
        return <Tag key={tag}>{tag}</Tag>;
    }

    const Icon = config.icon;
    return (
        <Tag key={tag} color={config.color} icon={<Icon />} style={{ marginRight: 0 }}>
            {tag}
        </Tag>
    );
};

export default ChangelogTagRenderer;
