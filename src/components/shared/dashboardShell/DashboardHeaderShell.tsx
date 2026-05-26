'use client'

import { theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import styles from '@organisms/headerComponent/headerComponent.module.scss';

interface DashboardHeaderShellProps {
    left: ReactNode;
    right?: ReactNode;
    className?: string;
    style?: CSSProperties;
    rightClassName?: string;
    rightStyle?: CSSProperties;
    fixed?: boolean;
    blurred?: boolean;
}

export default function DashboardHeaderShell({
    left,
    right,
    className = '',
    style,
    rightClassName = '',
    rightStyle,
    fixed = true,
    blurred = true,
}: DashboardHeaderShellProps) {
    const { token } = theme.useToken();

    return (
        <div
            className={`${styles.headerComponentWrap} ${fixed ? styles.fixedHeader : ''} ${className}`}
            style={{
                background: blurred ? token.colorBgBlur : token.colorBgContainer,
                borderBottom: `1px solid ${token.colorBorder}`,
                color: token.colorTextBase,
                backdropFilter: blurred ? 'blur(20px)' : undefined,
                ...style,
            }}
        >
            {left}
            <div
                className={`${styles.rightActionsWrap} ${rightClassName}`}
                style={rightStyle}
            >
                {right}
            </div>
        </div>
    );
}
