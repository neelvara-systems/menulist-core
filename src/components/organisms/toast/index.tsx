'use client'
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { Space, Alert, message } from 'antd';
import React, { useEffect, useState, SyntheticEvent, MouseEvent } from 'react';
import Style from "@organismsCSS/toast/toast.module.scss";
import { clearToast, getToastState } from '@reduxSlices/toast';

function Toast() {

    // message.config({
    //     top: 100,
    //     duration: 2,
    //     maxCount: 3,
    //     rtl: true,
    //     prefixCls: 'my-message',
    // });
    const toast = useAppSelector(getToastState);
    const dispatch = useAppDispatch();
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        if (toast?.type) {
            messageApi.open({
                type: toast.type,
                content: toast.message,
                duration: Number(((toast.time % 60000) / 1000).toFixed(0)),
                // duration: 1000,
                className: `${Style.toastMeassageWrap}`,
            }).then(() => {
            });
            dispatch(clearToast(null));
        }
    }, [toast])

    return <>{contextHolder}</>
}

export default Toast;
