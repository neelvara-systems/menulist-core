/**
 * Answerlattice public release gate.
 *
 * Public checkout remains closed while MenuList is the controlled reference
 * client. Existing approved workspaces keep their dashboard and Billing access;
 * this gate only controls public acquisition and new-workspace provisioning.
 */
export const ANSWERLATTICE_PUBLIC_ACCESS_MODE = 'early_access' as const;

export const ANSWERLATTICE_PUBLIC_CHECKOUT_ENABLED = (
    ANSWERLATTICE_PUBLIC_ACCESS_MODE as string
) === 'public_checkout';

export const ANSWERLATTICE_PUBLIC_PRIMARY_CTA = {
    href: '/early-access',
    label: 'Request early access',
} as const;
