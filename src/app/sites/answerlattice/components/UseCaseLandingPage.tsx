import AnswerlatticeFooter from './Footer';
import AnswerlatticeHeader from './Header';
import SeoLandingPage, { type SeoLandingPageProps } from './SeoLandingPage';

type UseCaseLandingPageProps = SeoLandingPageProps & {
    basePath?: string;
};

export default function UseCaseLandingPage({ basePath = '', ...props }: UseCaseLandingPageProps) {
    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <SeoLandingPage basePath={basePath} {...props} />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
