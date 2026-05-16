'use client';

import { useKBCategoriesCache } from '@hook/useKBCategoriesCache';
import { TreeSelect, message } from 'antd';
import { useEffect } from 'react';

interface KbTreeSelectProps {
    value?: string[];
    onChange?: (value: string[]) => void;
}

const KbTreeSelect: React.FC<KbTreeSelectProps> = ({ value, onChange }) => {
    const { categoriesData, getCategoriesCached } = useKBCategoriesCache();

    useEffect(() => {
        const fetchKbData = async () => {
            try {
                await getCategoriesCached();
            } catch (error) {
                message.error("Could not load knowledge base articles.");
            }
        };

        if (!categoriesData) {
            fetchKbData();
        }
    }, [categoriesData, getCategoriesCached]);

    const transformKbToTreeData = (kbData: any) => {
        if (!kbData?.categories) return [];
        return Object.values(kbData.categories).map((category: any) => {
            const sectionChildren = category.sections?.map((section: any) => ({
                title: section.title,
                value: `sec-${section.id}`,
                key: `sec-${section.id}`,
                children: section.articles?.map((article: any) => ({
                    title: article.title,
                    value: `art-${article.id}`,
                    key: `art-${article.id}`,
                })),
            }));

            const articleChildren = category.articles?.map((article: any) => ({
                title: article.title,
                value: `art-${article.id}`,
                key: `art-${article.id}`,
            }));

            return {
                title: category.title,
                value: `cat-${category.id}`,
                key: `cat-${category.id}`,
                children: [...(sectionChildren || []), ...(articleChildren || [])],
            };
        });
    };

    return (
        <TreeSelect
            treeData={transformKbToTreeData(categoriesData)}
            placeholder="Select related articles, sections, or categories"
            allowClear
            multiple
            treeCheckable
            value={value}
            onChange={onChange}
        />
    );
};

export default KbTreeSelect;
