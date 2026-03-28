import { useContentViewTracking } from '@hook/useContentViewTracking';
import { KnowledgeBaseArticleType } from '@type/knowledgeBase';

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
    article: KnowledgeBaseArticleType | null,
    options?: {
        href?: string;
        includeFullArticle?: boolean;
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
                      categoryTitle: article.categoryTitle || null,
                      sectionTitle: article.sectionTitle || null,
                      // Optionally store full article data (useful for modal views)
                      ...(options?.includeFullArticle && { fullArticle: article }),
                  },
              }
            : null
    );
};
