import NextErrorComponent from 'next/error';
import type { NextPageContext } from 'next';

interface ErrorPageProps {
    statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorPageProps) {
    return <NextErrorComponent statusCode={statusCode ?? 500} />;
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorPageProps => {
    const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
    return { statusCode };
};

export default ErrorPage;
