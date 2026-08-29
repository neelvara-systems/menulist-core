import MenuListHelpCenter from '@template/main-app/menuListHelpCenter';

async function page(props: { params: Promise<{ segments?: string[] }> }) {
    const params = await props.params;
    const [section] = params.segments || [];

    return <MenuListHelpCenter initialSection={section} />;
}

export default page;
