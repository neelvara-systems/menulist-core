import { fetchAnswerlatticePublicChangelogPage } from '@lib/answerlattice/publicContentClient';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAnswerlatticePublicContentRequestScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import DisplayChangelog from '@template/platform/changelog/displayChangelog';
import { ChangelogPage } from '@type/changelog';
import type { AnswerlatticePublicChangelogPage } from '@lib/answerlattice/publicContentBoundary';
import { message } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ChangelogViewProps {
    initialEntryId?: string;
}

const ChangelogView = ({ initialEntryId }: ChangelogViewProps) => {
    const t = useTranslations('HelpCenter');
    const dispatch = useAppDispatch();
    const [changelogPage, setChangelogPage] = useState<AnswerlatticePublicChangelogPage | null>(null);
    const requestScope = useAnswerlatticePublicContentRequestScope();
    const requestScopeKey = requestScope ? `${requestScope.tId}:${requestScope.sId}` : 'unavailable';
    const requestScopeKeyRef = useRef(requestScopeKey);
    requestScopeKeyRef.current = requestScopeKey;

    const fetchLatestPage = useCallback(async () => {
        if (!requestScope) return;
        const initiatingScopeKey = requestScopeKey;
        dispatch(startLoader('Fetching Changelog...'));
        try {
            const page = await fetchAnswerlatticePublicChangelogPage(requestScope);
            if (page && requestScopeKeyRef.current === initiatingScopeKey) {
                setChangelogPage(page);
            }
        } catch (error) {
            if (requestScopeKeyRef.current === initiatingScopeKey) {
                message.error(t('failedToLoadChangelogPage'));
            }
        } finally {
            dispatch(stopLoader('Fetching Changelog...'));
        }
    }, [dispatch, requestScope, requestScopeKey, t]);

    useEffect(() => {
        void fetchLatestPage();
    }, [fetchLatestPage]);

    return (
        <DisplayChangelog
            key={requestScopeKey}
            initialEntryId={initialEntryId}
            loadOlderPage={(pageNumber) => requestScope
                ? fetchAnswerlatticePublicChangelogPage(requestScope, { beforePageNumber: pageNumber })
                : Promise.resolve(null)}
            pageData={changelogPage}
            useInternalFallback={false}
        />
    );
};

export default ChangelogView;
