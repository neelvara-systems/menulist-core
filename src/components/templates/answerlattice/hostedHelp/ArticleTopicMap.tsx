'use client';

import type { AnswerlatticePublicArticleOutlineNode } from '@lib/answerlattice/publicRichText';
import Link from 'next/link';
import { useState } from 'react';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';
import styles from './ArticleTopicMap.module.scss';

type RelatedArticle = {
    id: string;
    href: string;
    title: string;
};

type ArticleTopicMapProps = {
    articleTitle: string;
    onSelectTopic: (headingId: string) => void;
    outline: AnswerlatticePublicArticleOutlineNode[];
    relatedArticles: RelatedArticle[];
};

function TopicBranch({
    node,
    onSelectTopic,
}: {
    node: AnswerlatticePublicArticleOutlineNode;
    onSelectTopic: (headingId: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children.length > 0;

    return (
        <li className={styles.branchItem}>
            <div style={{ display: 'flex', gap: 6 }}>
                {hasChildren ? (
                    <button
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.text}`}
                        className={styles.disclosureButton}
                        onClick={() => setExpanded(current => !current)}
                        style={{ flex: '0 0 44px', justifyContent: 'center', padding: 0 }}
                        type="button"
                    >
                        {expanded ? <LuChevronDown /> : <LuChevronRight />}
                    </button>
                ) : null}
                <button
                    className={styles.topicButton}
                    onClick={() => onSelectTopic(node.id)}
                    type="button"
                >
                    <span className={styles.topicText}>{node.text}</span>
                </button>
            </div>
            {hasChildren && expanded ? (
                <ul className={styles.childList}>
                    {node.children.map(child => (
                        <TopicBranch key={child.id} node={child} onSelectTopic={onSelectTopic} />
                    ))}
                </ul>
            ) : null}
        </li>
    );
}

export default function ArticleTopicMap({
    articleTitle,
    onSelectTopic,
    outline,
    relatedArticles,
}: ArticleTopicMapProps) {
    return (
        <section aria-label={`Topic map for ${articleTitle}`} className={styles.map}>
            <h1 className={styles.root}>{articleTitle}</h1>
            <div className={styles.branches}>
                {outline.length ? (
                    <ul className={styles.branchList}>
                        {outline.map(node => (
                            <TopicBranch key={node.id} node={node} onSelectTopic={onSelectTopic} />
                        ))}
                    </ul>
                ) : (
                    <p className={styles.empty}>This article has no section headings.</p>
                )}
                {relatedArticles.length ? (
                    <div className={styles.related}>
                        <p className={styles.relatedTitle}>Related published articles</p>
                        {relatedArticles.map(item => (
                            <Link className={styles.relatedLink} href={item.href} key={item.id}>
                                {item.title}
                            </Link>
                        ))}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
