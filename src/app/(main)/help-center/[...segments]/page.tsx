import HelpCenter from "@template/main-app/helpCenter";

function page({ params }: { params: { segments?: string[] } }) {
    const [tab, resourceType, resourceId] = params.segments || [];

    return (
        <HelpCenter
            initialArticleId={tab === 'kb' && resourceType === 'articles' ? resourceId : undefined}
            initialChangelogId={tab === 'changelog' ? resourceType : undefined}
            initialTab={tab}
        />
    );
}

export default page;
