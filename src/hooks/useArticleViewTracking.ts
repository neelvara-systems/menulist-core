import { useContentViewTracking } from '@hook/useContentViewTracking';
import type { AnswerlatticeReadableArticle } from '@lib/answerlattice/publicContentBoundary';

/**
 * Convenience hook for tracking article views
 * Wrapper around useContentViewTracking specifically for articles
 * 
 * @param article - The article being viewed
 * @param options - Optional configuration
 * 
 * @example
 * ```tsx
 * const ArticleComponent = ({ article }) => {
 *   useArticleViewTracking(article);
 *   return <div>{article.content}</div>;
 * };
 * ```
 */
export const useArticleViewTracking = (
    article: AnswerlatticeReadableArticle | null,
    options?: {
        href?: string;
    }
) => {
    useContentViewTracking(
        article
            ? {
                  id: article.id,
                  type: 'article',
                  title: article.title,
                  href: options?.href,
                  meta: {
                      ...(article.categoryTitle ? { categoryTitle: article.categoryTitle } : {}),
                      ...(article.sectionTitle ? { sectionTitle: article.sectionTitle } : {}),
                  },
              }
            : null
    );
};
