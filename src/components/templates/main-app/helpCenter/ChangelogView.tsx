import { useChangelogCache } from '@hook/useChangelogCache';
import DisplayChangelog from '@template/platform/changelog/displayChangelog';
import { ChangelogPage } from '@type/changelog';
import { message } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

interface ChangelogViewProps {
    initialEntryId?: string;
}

const ChangelogView = ({ initialEntryId }: ChangelogViewProps) => {
    const t = useTranslations('HelpCenter');
    const { getItem } = useChangelogCache();
    const [changelogPage, setChangelogPage] = useState<ChangelogPage | null>(null);

    const fetchLatestPage = useCallback(async () => {
        try {
            const page = await getItem();
            if (page) {
                setChangelogPage(page);
            }
        } catch (error) {
            message.error(t('failedToLoadChangelogPage'));
        }
    }, [getItem, t]);

    useEffect(() => {
        void fetchLatestPage();
    }, [fetchLatestPage]);

    return (
        <DisplayChangelog initialEntryId={initialEntryId} pageData={changelogPage} />
    );
};

export default ChangelogView;
