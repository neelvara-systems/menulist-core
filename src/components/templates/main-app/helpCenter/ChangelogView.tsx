import { useChangelogCache } from '@hook/useChangelogCache';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import DisplayChangelog from '@template/platform/changelog/displayChangelog';
import { ChangelogPage } from '@type/changelog';
import { message, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useState } from 'react';

const { Title, Paragraph } = Typography;

const ChangelogView = () => {
    const t = useTranslations('HelpCenter');
    const { getItem } = useChangelogCache();
    const [changelogPage, setChangelogPage] = useState<ChangelogPage | null>(null);
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)

    const fetchLatestPage = async () => {
        if (!storeDetails) return;
        try {
            const page = await getItem();
            if (page) {
                setChangelogPage(page);
            }
        } catch (error) {
            message.error(t('failedToLoadChangelogPage'));
        }
    };

    useEffect(() => {
        fetchLatestPage();
    }, [storeDetails]);

    return (
        <DisplayChangelog pageData={changelogPage} />
    );
};

export default ChangelogView;