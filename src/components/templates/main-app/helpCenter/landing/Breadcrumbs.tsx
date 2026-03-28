'use client'
import { Breadcrumb } from 'antd';
import Link from 'next/link';

interface BreadcrumbItem {
    title: string;
    href?: string;
    onClick?: () => void;
}

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    return (
        <Breadcrumb>
            {items.map((item, index) => (
                <Breadcrumb.Item key={index}>
                    {item.onClick ? (
                        <a onClick={item.onClick} style={{ cursor: 'pointer' }}>{item.title}</a>
                    ) : item.href ? (
                        <Link href={item.href}>{item.title}</Link>
                    ) : (
                        item.title
                    )}
                </Breadcrumb.Item>
            ))}
        </Breadcrumb>
    );
}

export default Breadcrumbs;
