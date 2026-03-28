'use client'
import AntdClient from "@lib/antd/antdClient";
import Loader from "@organisms/loader";
import Toast from "@organisms/toast";

const AntdThemeProvider = (props: any) => {
    return (
        <AntdClient>
            <Toast />
            <Loader />
            {props.children}
        </AntdClient>
    )
}

export default AntdThemeProvider;