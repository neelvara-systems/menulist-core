'use client'
import { StoreDataType } from '@type/platform/store';
import Head from 'next/head';

interface GoogleSearchConsoleProps {
    storeDetails?: StoreDataType;
}

const GoogleSearchConsole = ({ storeDetails }: GoogleSearchConsoleProps) => {
    const verificationCode = storeDetails?.analytics?.googleSearchConsole;

    if (!verificationCode) return null;

    return (
        <Head>
            <meta 
                name="google-site-verification" 
                content={verificationCode} 
            />
        </Head>
    );
};

export default GoogleSearchConsole;
