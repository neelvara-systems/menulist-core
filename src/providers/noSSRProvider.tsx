"use client"

import React from 'react'

export default function NoSSRProvider(props: { children: React.ReactNode }) {
    return <>{props.children}</>;
}
