'use client';

import { getCategories } from '@database/knowledgeBase/categories';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { TreeSelect, message } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useContext, useEffect } from 'react';

interface KbTreeSelectProps {
    value?: string[];
    onChange?: (value: string[]) => void;
}

const KbTreeSelect: React.FC<KbTreeSelectProps> = ({ value, onChange }) => {
    const { cachedKBCategories, setCachedKBCategories } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    useEffect(() => {
        const fetchKbData = async () => {
            try {
                const res = await getCategories();
                setCachedKBCategories({ cachedOn: Timestamp.now(), kBCategories: res });
            } catch (error) {
                message.error("Could not load knowledge base articles.");
            }
        };

        if (!cachedKBCategories?.kBCategories) {
            fetchKbData();
        }
    }, [cachedKBCategories, setCachedKBCategories]);

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
            treeData={transformKbToTreeData(cachedKBCategories?.kBCategories)}
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
