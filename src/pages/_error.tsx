import type { NextPageContext } from 'next';
import NextErrorComponent from 'next/error';

type ErrorPageProps = {
    statusCode: number;
};

function ErrorPage({ statusCode }: ErrorPageProps) {
    return <NextErrorComponent statusCode={statusCode} />;
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorPageProps => ({
    statusCode: res?.statusCode ?? err?.statusCode ?? 404,
});

export default ErrorPage;
