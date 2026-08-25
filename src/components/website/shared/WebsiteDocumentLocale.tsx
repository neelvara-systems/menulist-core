'use client';

import { getLocaleDirection } from '@lib/localization/config';
import { useEffect } from 'react';

type WebsiteDocumentLocaleProps = {
    locale: string;
};

export default function WebsiteDocumentLocale({ locale }: WebsiteDocumentLocaleProps) {
    const direction = getLocaleDirection(locale);

    useEffect(() => {
        let applied = false;
        let previousDirection = '';
        let previousLanguage = '';

        // The shared website provider applies the cookie locale after nested
        // providers mount. Apply the route-owned resource locale on the next
        // frame so the document language matches the localized URL as well as
        // the already-correct content wrapper.
        const frame = window.requestAnimationFrame(() => {
            previousDirection = document.documentElement.dir;
            previousLanguage = document.documentElement.lang;
            document.documentElement.dir = direction;
            document.documentElement.lang = locale;
            applied = true;
        });

        return () => {
            window.cancelAnimationFrame(frame);
            if (
                applied
                && document.documentElement.dir === direction
                && document.documentElement.lang === locale
            ) {
                document.documentElement.dir = previousDirection;
                document.documentElement.lang = previousLanguage;
            }
        };
    }, [direction, locale]);

    return null;
}
