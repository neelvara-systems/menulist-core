"use client"
import dynamic from 'next/dynamic'
import React from 'react'

const NoSSRProvider = props => (
    <React.Fragment>{props.children}</React.Fragment>
)
export default dynamic(() => Promise.resolve(NoSSRProvider), {
    ssr: false
})