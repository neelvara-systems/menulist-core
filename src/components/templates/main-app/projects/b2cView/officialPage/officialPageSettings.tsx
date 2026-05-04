import { applyLocalizedDraftMap, getLocalizedStoreValue, getStoreManagedLanguages, getStorePreferredLanguage } from '@lib/localization/storeContent';
import { StoreDataType } from '@type/platform/store';
import { Form } from 'antd';
import { useEffect, useMemo } from 'react';
import OfficialPageTab from '../../../businessSettings/tabs/OfficialPageTab';

interface OfficialPageSettingsProps {
    onLanguageChange?: (language: string) => void;
    storeDetails: StoreDataType;
    onStoreDraftChange: (storeDetails: StoreDataType) => void;
}

function buildLocalizedPresenceDrafts(storeDetails: StoreDataType) {
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    return Object.fromEntries(
        managedLanguages.map((languageCode) => [
            languageCode,
            {
                descriptor: getLocalizedStoreValue(storeDetails?.publicPresence?.descriptor, languageCode, ''),
                displayName: getLocalizedStoreValue(storeDetails?.publicPresence?.displayName, languageCode, ''),
                knownFor: getLocalizedStoreValue(storeDetails?.publicPresence?.knownFor, languageCode, ''),
                specialNote: getLocalizedStoreValue(storeDetails?.publicPresence?.specialNote, languageCode, ''),
            },
        ]),
    );
}

function getInitialValues(storeDetails: StoreDataType) {
    const contentLanguage = getStorePreferredLanguage(storeDetails);
    return {
        activeLanguages: storeDetails?.activeLanguages || [],
        defaultLanguage: storeDetails?.defaultLanguage || contentLanguage,
        __localizedPublicPresenceDrafts: buildLocalizedPresenceDrafts(storeDetails),
        __storeContentLanguage: contentLanguage,
        publicPresence: {
            ...(storeDetails?.publicPresence || {}),
            descriptor: getLocalizedStoreValue(storeDetails?.publicPresence?.descriptor, contentLanguage, ''),
            displayName: getLocalizedStoreValue(storeDetails?.publicPresence?.displayName, contentLanguage, ''),
            knownFor: getLocalizedStoreValue(storeDetails?.publicPresence?.knownFor, contentLanguage, ''),
            specialNote: getLocalizedStoreValue(storeDetails?.publicPresence?.specialNote, contentLanguage, ''),
        },
    };
}

function buildDraftStore(storeDetails: StoreDataType, values: any): StoreDataType {
    const currentPresence = storeDetails?.publicPresence || {};
    const visiblePresence = values.publicPresence || {};
    const contentLanguage = values.__storeContentLanguage || getStorePreferredLanguage(storeDetails);
    const localizedPresenceDrafts = {
        ...(values.__localizedPublicPresenceDrafts || {}),
        [contentLanguage]: {
            ...((values.__localizedPublicPresenceDrafts || {})[contentLanguage] || {}),
            descriptor: visiblePresence.descriptor || '',
            displayName: visiblePresence.displayName || '',
            knownFor: visiblePresence.knownFor || '',
            specialNote: visiblePresence.specialNote || '',
        },
    };

    const publicPresence = {
        ...currentPresence,
        ...visiblePresence,
        displayName: applyLocalizedDraftMap(
            currentPresence.displayName,
            Object.fromEntries(Object.entries(localizedPresenceDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.displayName || ''])),
        ),
        descriptor: applyLocalizedDraftMap(
            currentPresence.descriptor,
            Object.fromEntries(Object.entries(localizedPresenceDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.descriptor || ''])),
        ),
        knownFor: applyLocalizedDraftMap(
            currentPresence.knownFor,
            Object.fromEntries(Object.entries(localizedPresenceDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.knownFor || ''])),
        ),
        specialNote: applyLocalizedDraftMap(
            currentPresence.specialNote,
            Object.fromEntries(Object.entries(localizedPresenceDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.specialNote || ''])),
        ),
    };

    return {
        ...storeDetails,
        publicPresence,
    } as StoreDataType;
}

export default function OfficialPageSettings({
    onLanguageChange,
    storeDetails,
    onStoreDraftChange,
}: OfficialPageSettingsProps) {
    const [form] = Form.useForm();
    const initialValues = useMemo(() => getInitialValues(storeDetails), [storeDetails?.storeId]);

    useEffect(() => {
        form.setFieldsValue(initialValues);
    }, [form, initialValues]);

    const emitDraft = () => {
        const values = form.getFieldsValue(true);
        if (values.__storeContentLanguage) {
            onLanguageChange?.(values.__storeContentLanguage);
        }
        onStoreDraftChange(buildDraftStore(storeDetails, values));
    };

    const handlePublicPresenceChange = (field: string, value: any) => {
        form.setFieldValue(['publicPresence', field], value);
        emitDraft();
    };

    return (
        <Form
            form={form}
            initialValues={initialValues}
            layout="vertical"
            onValuesChange={emitDraft}
        >
            <OfficialPageTab
                compact
                showDistributionTools={false}
                publicPresence={initialValues.publicPresence}
                onPublicPresenceChange={handlePublicPresenceChange}
                onContentLanguageChange={onLanguageChange}
                subdomain={storeDetails?.subdomain}
                customDomain={storeDetails?.customDomain}
            />
        </Form>
    );
}
