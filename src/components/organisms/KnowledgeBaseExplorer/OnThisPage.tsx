import { normalizeHelpCenterRouteSegment } from '@constant/navigations';
import { KnowledgeBaseArticleMeta } from '@type/knowledgeBase';
import { Flex, Typography } from 'antd';
import { LuDot } from 'react-icons/lu';

const { Title } = Typography;

interface OnThisPageProps {
    articles: KnowledgeBaseArticleMeta[];
    from?: string;
}

const OnThisPage = ({ articles, from }: OnThisPageProps) => {
    const items = articles.map(article => {
        const slug = normalizeHelpCenterRouteSegment(article.title);
        return {
            key: article.id,
            href: `#${slug}`,
            title: article.title,
        };
    });

    const handleScroll = (e: React.MouseEvent<HTMLElement>, href: string) => {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);

        if (!targetElement) return;
        if (from === 'modal') {
            const scrollableContainer = targetElement.closest('.ant-modal-body');
            if (scrollableContainer) {
                const offset = targetElement.offsetTop;
                scrollableContainer.scrollTo({
                    top: offset - 10, // 10px offset from top
                    behavior: 'smooth',
                });
            }
        } else {
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - 74; // 74px header offset

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            });
        }
    };

    return (
        <div>
            <Title level={5}>On this page</Title>
            <Flex vertical gap="small">
                {items.map(item => (
                    <Typography.Link
                        key={item.key}
                        href={item.href}
                        style={{ color: '#888' }}
                        className="on-this-page-link"
                        onClick={(e) => handleScroll(e, item.href)}
                    >
                        <Flex gap="small" align="center">
                            <LuDot size={16} /> {item.title}
                        </Flex>
                    </Typography.Link>
                ))}
            </Flex>
        </div>
    );
};

export default OnThisPage;
