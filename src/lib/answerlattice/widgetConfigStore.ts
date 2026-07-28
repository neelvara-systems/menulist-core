import { DB_COLLECTIONS } from '@constant/database';
import { FieldValue } from 'firebase-admin/firestore';
import {
    ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION,
    type AnswerlatticeWidgetConfig,
    normalizeAnswerlatticeWidgetConfigVersion,
    normalizeWidgetAllowedOrigins,
    normalizeWidgetConfig,
} from './widgetConfig';
import { isAnswerlatticeStoreInScope } from './sessionScope';

export type SaveAnswerlatticeWidgetConfigResult =
    | {
        status: 'saved' | 'unchanged';
        allowedOrigins: string[];
        config: AnswerlatticeWidgetConfig;
        configVersion: number;
        storeData: Record<string, any>;
    }
    | {
        status: 'conflict';
        configVersion: number;
    }
    | {
        status: 'forbidden';
    }
    | {
        status: 'not_found';
    };

const widgetConfigEquals = (
    left: Record<string, any>,
    right: Record<string, any>,
): boolean => JSON.stringify(normalizeWidgetConfig(left)) === JSON.stringify(normalizeWidgetConfig(right));

const allowedOriginsEqual = (left: string[], right: string[]): boolean => {
    if (left.length !== right.length) return false;
    const leftSorted = [...left].sort();
    const rightSorted = [...right].sort();
    return leftSorted.every((origin, index) => origin === rightSorted[index]);
};

export const saveAnswerlatticeWidgetConfigAdmin = async (params: {
    allowedOrigins: string[];
    config: AnswerlatticeWidgetConfig;
    db: FirebaseFirestore.Firestore;
    expectedConfigVersion: number;
    storeId: number;
    tenantId: number;
}): Promise<SaveAnswerlatticeWidgetConfigResult> => {
    const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(params.storeId));

    return params.db.runTransaction(async transaction => {
        const storeSnapshot = await transaction.get(storeRef);
        if (!storeSnapshot.exists) return { status: 'not_found' as const };

        const storeData = storeSnapshot.data() || {};
        if (!isAnswerlatticeStoreInScope(
            storeData,
            { tenantId: params.tenantId, storeId: params.storeId },
            storeSnapshot.id,
        )) {
            return { status: 'forbidden' as const };
        }

        const currentConfig = normalizeWidgetConfig(storeData.widgetConfig);
        const currentOrigins = normalizeWidgetAllowedOrigins(storeData.widgetAllowedOrigins);
        const currentConfigVersion = normalizeAnswerlatticeWidgetConfigVersion(storeData.widgetConfigVersion);

        if (
            widgetConfigEquals(currentConfig, params.config)
            && allowedOriginsEqual(currentOrigins, params.allowedOrigins)
        ) {
            return {
                status: 'unchanged' as const,
                allowedOrigins: currentOrigins,
                config: currentConfig,
                configVersion: currentConfigVersion,
                storeData,
            };
        }

        if (currentConfigVersion !== params.expectedConfigVersion) {
            return {
                status: 'conflict' as const,
                configVersion: currentConfigVersion,
            };
        }
        if (currentConfigVersion >= Number.MAX_SAFE_INTEGER) {
            throw new Error('Answerlattice widget config version is exhausted.');
        }

        const configVersion = currentConfigVersion + 1;
        transaction.set(storeRef, {
            widgetConfig: params.config,
            widgetAllowedOrigins: params.allowedOrigins,
            widgetConfigSchemaVersion: ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION,
            widgetConfigUpdatedAt: FieldValue.serverTimestamp(),
            widgetConfigVersion: configVersion,
        }, { merge: true });

        return {
            status: 'saved' as const,
            allowedOrigins: params.allowedOrigins,
            config: params.config,
            configVersion,
            storeData: {
                ...storeData,
                widgetConfig: params.config,
                widgetAllowedOrigins: params.allowedOrigins,
                widgetConfigSchemaVersion: ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION,
                widgetConfigVersion: configVersion,
            },
        };
    });
};
