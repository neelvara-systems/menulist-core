'use client';

import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import SchemaMarkup from '@/components/website/SchemaMarkup';
import HomePage from '@/components/website/home/HomePage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';

export default function Page() {
    return (
        <div className="ws-page">
            <SchemaMarkup />
            <Header />
            <HomePage />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}