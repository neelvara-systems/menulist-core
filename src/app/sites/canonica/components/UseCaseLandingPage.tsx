import CanonicaFooter from './Footer';
import CanonicaHeader from './Header';
import SeoLandingPage, { type SeoLandingPageProps } from './SeoLandingPage';

type UseCaseLandingPageProps = SeoLandingPageProps & {
    basePath?: string;
};

export default function UseCaseLandingPage({ basePath = '', ...props }: UseCaseLandingPageProps) {
    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <SeoLandingPage basePath={basePath} {...props} />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
