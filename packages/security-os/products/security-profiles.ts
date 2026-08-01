import type { SecurityOsProductProfile } from '../schemas/security-os-schema';

/**
 * SecurityOS product profiles use deployment slugs, not short database product
 * codes. Phase one deeply maps MenuList and Answerlattice. The other current
 * deployment products are registered so their absence cannot be mistaken for
 * completed coverage.
 */
export const securityOsProductProfiles: SecurityOsProductProfile[] = [
    {
        id: 'menulist',
        displayName: 'MenuList',
        stage: 'phase-one',
        sourcePaths: [
            'src/app/api',
            'src/lib/auth',
            'src/lib/security',
            'firestore.rules',
            'storage.rules',
            'functions/src',
            '__docs__/security',
        ],
        exclusions: [
            'Live production exploitation',
            'Automatic patches or deployments',
            'Answerlattice, CampaignCue, SignalDesk, and MyCodex product truth',
        ],
    },
    {
        id: 'answerlattice',
        displayName: 'Answerlattice',
        stage: 'phase-one',
        sourcePaths: [
            'src/app/api/answerlattice',
            'src/lib/answerlattice',
            'firestore-answerlattice.rules',
            'storage-answerlattice.rules',
            'functions-answerlattice/src',
            '__docs__/answerlattice/doctrine',
        ],
        exclusions: [
            'MenuList product truth',
            'Automatic publication of canonical answers or knowledge',
            'Live tenant data access',
            'Automatic patches or deployments',
        ],
    },
    {
        id: 'campaigncue',
        displayName: 'CampaignCue',
        stage: 'registered-only',
        sourcePaths: [
            'src/app/sites/campaigncue',
            'firestore-campaigncue.rules',
            'storage-campaigncue.rules',
            '__docs__/campaigncue',
        ],
        exclusions: ['Provider activation', 'Publishing mutations', 'Automatic patches or deployments'],
    },
    {
        id: 'signaldesk',
        displayName: 'SignalDesk',
        stage: 'registered-only',
        sourcePaths: [
            'src/app/(signaldesk)/signaldesk',
            'firestore-signaldesk.rules',
            'storage-signaldesk.rules',
            'functions-signaldesk/src',
            '__docs__/menulist-signaldesk',
        ],
        exclusions: ['Outbound provider actions', 'Automatic patches or deployments'],
    },
    {
        id: 'mycodex',
        displayName: 'MyCodex',
        stage: 'registered-only',
        sourcePaths: [
            'src/app/sites/mycodex',
            'src/proxy.ts',
            '__docs__/mycodex-pwa-shell',
        ],
        exclusions: ['Database or Firebase scope', 'Public domain assumptions', 'Automatic patches or deployments'],
    },
    {
        id: 'neelvara',
        displayName: 'Neelvara',
        stage: 'registered-only',
        sourcePaths: [
            'src/app/sites/neelvara',
            'src/constants/deploymentTargets.ts',
            '__docs__/neelvara-main-website',
        ],
        exclusions: ['Firebase scope', 'Sister-product runtime assumptions', 'Automatic patches or deployments'],
    },
];
