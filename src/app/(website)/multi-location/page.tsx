import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import MultiLocationPage from '@/components/website/multi-location/MultiLocationPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Multi-Location Menu Management — MenuList | One Menu, Every Outlet',
    description: 'Manage menus across all your locations from one place. One master menu, every outlet inherits it. Update once — every location reflects the change instantly.',
    alternates: {
        canonical: '/multi-location',
    },
    openGraph: {
        title: 'Multi-Location Menu Management — MenuList | One Menu, Every Outlet',
        description: 'Manage menus across all your locations from one place. One master menu, every outlet inherits it. Update once — every location reflects the change instantly.',
        url: '/multi-location',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <Header />
            <MultiLocationPage />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}
