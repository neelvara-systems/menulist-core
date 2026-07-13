import { fetchAnswerlatticePublicChangelogPage } from '@lib/answerlattice/publicContentClient';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import DisplayChangelog from '@template/platform/changelog/displayChangelog';
import { ChangelogPage } from '@type/changelog';
import type { AnswerlatticePublicChangelogPage } from '@lib/answerlattice/publicContentBoundary';
import { message } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

interface ChangelogViewProps {
    initialEntryId?: string;
}

const ChangelogView = ({ initialEntryId }: ChangelogViewProps) => {
    const t = useTranslations('HelpCenter');
    const dispatch = useAppDispatch();
    const [changelogPage, setChangelogPage] = useState<AnswerlatticePublicChangelogPage | null>(null);

    const fetchLatestPage = useCallback(async () => {
        dispatch(startLoader('Fetching Changelog...'));
        try {
            const page = await fetchAnswerlatticePublicChangelogPage();
            if (page) {
                setChangelogPage(page);
            }
        } catch (error) {
            message.error(t('failedToLoadChangelogPage'));
        } finally {
            dispatch(stopLoader('Fetching Changelog...'));
        }
    }, [dispatch, t]);

    useEffect(() => {
        void fetchLatestPage();
    }, [fetchLatestPage]);

    return (
        <DisplayChangelog
            initialEntryId={initialEntryId}
            loadOlderPage={(pageNumber) => fetchAnswerlatticePublicChangelogPage({ beforePageNumber: pageNumber })}
            pageData={changelogPage}
            useInternalFallback={false}
        />
    );
};

export default ChangelogView;
