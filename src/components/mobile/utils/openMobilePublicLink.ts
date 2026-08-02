'use client'

import { Toast } from '../antd';
import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';
import {
    getBoundedMobileOwnerStringContext,
    logMobileOwnerFailure,
    type MobileOwnerLogContext,
} from './mobileOwnerDiagnostics';

interface OpenMobilePublicLinkOptions {
    flow?: string;
    metadata?: MobileOwnerLogContext;
    showToast?: boolean;
    source?: string;
}

export function openMobilePublicLink(url?: string | null, options: OpenMobilePublicLinkOptions = {}) {
    if (!url) return false;

    // In installed PWAs, same-window public navigation remounts the owner shell
    // when the external view is dismissed. A blank context preserves shell state.
    try {
        openIsolatedBrowserUrl(url);
        return true;
    } catch (error) {
        logMobileOwnerFailure('mobile_public_link_open_failed', error, {
            surface: 'mobile_public_link_helper',
            flow: options.flow || 'public_link_open',
            ...(options.metadata || {}),
            ...getBoundedMobileOwnerStringContext('source', options.source),
            ...getBoundedMobileOwnerStringContext('publicLinkUrl', url),
        });

        if (options.showToast !== false) {
            Toast.show({ content: 'Unable to open link', duration: 1500 });
        }

        return false;
    }
}
