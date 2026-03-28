'use client';

import { theme } from 'antd';
import React from 'react';
import styles from './AiSearchBarComponent.module.scss';

const TypingIndicator = () => {
    const { token } = theme.useToken();

    const dotStyle: React.CSSProperties = {
        height: '8px',
        width: '8px',
        backgroundColor: token.colorTextTertiary,
        borderRadius: '50%',
        display: 'inline-block',
        margin: '0 2px',
        animationName: styles.bounce,
        animationDuration: '1.4s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
        animationFillMode: 'both',
    };

    return (
        <div className={styles.typingIndicator}>
            <span style={{ ...dotStyle, animationDelay: '-0.32s' }}></span>
            <span style={{ ...dotStyle, animationDelay: '-0.16s' }}></span>
            <span style={dotStyle}></span>
        </div>
    );
};

export default TypingIndicator;
