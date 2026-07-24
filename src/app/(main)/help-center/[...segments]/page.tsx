import HelpCenter from "@template/main-app/helpCenter";

async function page(props: { params: Promise<{ segments?: string[] }> }) {
    const params = await props.params;
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
