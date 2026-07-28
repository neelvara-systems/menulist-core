'use client';

import { theme } from 'antd';
import React from 'react';
import styles from './AiSearchBarComponent.module.scss';

const TypingIndicator = () => {
    const { token } = theme.useToken();

    const dotStyle: React.CSSProperties = {
        backgroundColor: token.colorTextTertiary,
    };

    return (
        <div className={styles.typingIndicator}>
            <span className={styles.typingDot} style={{ ...dotStyle, animationDelay: '-0.32s' }}></span>
            <span className={styles.typingDot} style={{ ...dotStyle, animationDelay: '-0.16s' }}></span>
            <span className={styles.typingDot} style={dotStyle}></span>
        </div>
    );
};

export default TypingIndicator;
