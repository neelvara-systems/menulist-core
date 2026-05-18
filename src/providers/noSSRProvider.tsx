"use client"

import React, { useEffect, useState } from 'react'

export default function NoSSRProvider(props: { children: React.ReactNode }) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) return null;

    return <>{props.children}</>;
}
