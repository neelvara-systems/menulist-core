import { renderAnswerlatticeOwnerNotification } from './answerlattice';
import { renderMenuListOwnerNotification } from './menulist';
import type { OwnerNotificationTemplate } from '../types';
import type { OwnerNotificationProductId } from '@data/shared/ownerNotificationRegistry';

export function renderOwnerNotificationTemplate(
    productId: OwnerNotificationProductId,
    templateKey: string,
    metadata: Record<string, unknown>,
): OwnerNotificationTemplate | null {
    if (productId === 'ML') {
        return renderMenuListOwnerNotification(templateKey, metadata);
    }
    if (productId === 'AL') {
        return renderAnswerlatticeOwnerNotification(templateKey, metadata);
    }
    return null;
}
