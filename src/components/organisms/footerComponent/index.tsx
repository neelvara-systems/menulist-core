import React from 'react'
import { Layout, Menu, theme } from 'antd';
import styles from '@organismsCSS/footerComponent/footerComponent.module.scss'
import { LOGO_TEXT } from '@constant/common';

const { Header, Content, Footer, Sider }: any = Layout;
function FooterComponent() {
    return (
        <Footer style={{ textAlign: 'center' }}>
            {LOGO_TEXT} ©{new Date().getUTCFullYear()}
        </Footer>
    )
}

export default FooterComponent
