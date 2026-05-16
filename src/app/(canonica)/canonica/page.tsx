import CanonicaClientHome from '@template/canonica/clientPortal/CanonicaClientHome';

/**
 * Canonica base route — renders the client support portal.
 *
 * Keeping this as real content avoids an empty desktop shell if the app-router
 * redirect is swallowed during hydration.
 */
export default function CanonicaBasePage() {
    return <CanonicaClientHome />;
}
