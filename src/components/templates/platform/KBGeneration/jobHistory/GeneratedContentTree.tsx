import { IngestionJobCategoriesMap } from '@type/knowledgeBase';
import { Tree } from 'antd';
import React from 'react';
import { LuFile, LuFolder, LuLibrary } from 'react-icons/lu';

interface GeneratedContentTreeProps {
    categories?: IngestionJobCategoriesMap;
}

const GeneratedContentTree: React.FC<GeneratedContentTreeProps> = ({ categories }) => {
    if (!categories) {
        return null;
    }

    const treeData = Object.values(categories).map(category => ({
        title: category.title,
        key: category.id,
        icon: <LuLibrary />,
        children: [
            ...(category.sections || []).map(section => ({
                title: section.title,
                key: section.id,
                icon: <LuFolder />,
                children: (section.articles || []).map(article => ({
                    title: article.title,
                    key: article.id,
                    icon: <LuFile />,
                    isLeaf: true,
                })),
            })),
            ...(category.articles || []).map(article => ({
                title: article.title,
                key: article.id,
                icon: <LuFile />,
                isLeaf: true,
            })),
        ],
    }));

    return (
        <Tree
            showIcon
            defaultExpandAll
            treeData={treeData}
            rootStyle={{ padding: 10 }}
            style={{ background: 'transparent' }}
        />
    );
};

export default GeneratedContentTree;
