interface CampaignCueLoaderLogoProps {
    idPrefix?: string;
}

function CampaignCueLoaderLogo({
    idPrefix = 'campaigncue-loader-logo',
}: CampaignCueLoaderLogoProps) {
    const titleId = `${idPrefix}-title`;

    return (
        <svg
            width="128"
            height="128"
            viewBox="0 0 128 128"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-labelledby={titleId}
        >
            <title id={titleId}>CampaignCue</title>
            <rect width="128" height="128" rx="24" fill="#0F766E" />
            <path
                d="M35 38C35 33.5817 38.5817 30 43 30H85C89.4183 30 93 33.5817 93 38V88C93 92.4183 89.4183 96 85 96H43C38.5817 96 35 92.4183 35 88V38Z"
                fill="white"
            />
            <path d="M50 52H78" stroke="#0F766E" strokeWidth="8" strokeLinecap="round" />
            <path d="M50 65H72" stroke="#0F766E" strokeWidth="8" strokeLinecap="round" />
            <path d="M50 78H78" stroke="#0F766E" strokeWidth="8" strokeLinecap="round" />
            <path d="M89 25V51L109 38L89 25Z" fill="#F59E0B" />
        </svg>
    );
}

export default CampaignCueLoaderLogo;
