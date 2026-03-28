import React from 'react'
import { Layout, Menu, theme } from 'antd';
import styles from '@organismsCSS/footerComponent/footerComponent.module.scss'
import { LOGO_TEXT } from '@constant/common';

const { Header, Content, Footer, Sider }: any = Layout;
function FooterComponent() {
    return (
        <Footer style={{ textAlign: 'center' }}>{LOGO_TEXT} ©2023</Footer>
    )
}

export default FooterComponent